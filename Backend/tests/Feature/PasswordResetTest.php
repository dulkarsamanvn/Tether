<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\PasswordResetLink;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    private function account(array $attributes = []): User
    {
        return User::factory()->create($attributes + ['is_active' => true]);
    }

    private function credentials(User $user, ?string $token = null): array
    {
        return [
            'email' => $user->email,
            'token' => $token ?? Password::broker()->createToken($user),
            'password' => 'a-new-secret-password',
            'password_confirmation' => 'a-new-secret-password',
        ];
    }

    public function test_link_request_is_private_and_sends_only_to_an_active_account(): void
    {
        $active = $this->account();
        $inactive = $this->account(['is_active' => false]);

        $known = $this->postJson('/api/forgot-password', ['email' => $active->email])->assertAccepted();
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'unknown@example.invalid'])->assertAccepted();
        $disabled = $this->postJson('/api/forgot-password', ['email' => $inactive->email])->assertAccepted();

        $this->assertSame($known->json(), $unknown->json());
        $this->assertSame($known->json(), $disabled->json());
        $this->assertSame(['message', 'resend_after'], array_keys($known->json()));
        Notification::assertSentTo($active, PasswordResetLink::class, function ($notification) use ($active) {
            $hash = DB::table('password_reset_tokens')->where('email', $active->email)->value('token');
            $this->assertNotSame($notification->token, $hash);
            $this->assertTrue(Hash::check($notification->token, $hash));

            return true;
        });
        Notification::assertNotSentTo($inactive, PasswordResetLink::class);
        Notification::assertCount(1);
    }

    public function test_request_validation_and_resend_limits_apply_to_unknown_accounts_too(): void
    {
        $this->postJson('/api/forgot-password', ['email' => ['bad']])->assertUnprocessable()->assertJsonValidationErrors('email');
        $email = 'unknown@example.invalid';
        $this->postJson('/api/forgot-password', compact('email'))->assertAccepted();
        $this->postJson('/api/forgot-password', compact('email'))->assertStatus(429)->assertHeader('Retry-After');
        $this->travel(61)->seconds();
        $this->postJson('/api/forgot-password', compact('email'))->assertAccepted();
        Notification::assertNothingSent();
    }

    public function test_ip_limit_prevents_requests_to_many_different_accounts(): void
    {
        foreach (range(1, 5) as $number) {
            $this->postJson('/api/forgot-password', ['email' => "unknown{$number}@example.invalid"])->assertAccepted();
        }
        $this->postJson('/api/forgot-password', ['email' => 'another@example.invalid'])->assertStatus(429);
    }

    public function test_broker_cooldown_keeps_existing_link_and_a_later_request_replaces_it(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $user = $this->account();
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertAccepted();
        $first = Notification::sent($user, PasswordResetLink::class)->first();
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertAccepted();
        Notification::assertCount(1);
        $this->assertTrue(Password::broker()->tokenExists($user, $first->token));
        $this->travel(61)->seconds();
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertAccepted();
        Notification::assertCount(2);
        $this->assertFalse($first->shouldSend($user, 'mail'));
        $this->assertTrue(Notification::sent($user, PasswordResetLink::class)->last()->shouldSend($user, 'mail'));
    }

    public function test_successful_reset_consumes_link_revokes_sessions_and_requires_sign_in(): void
    {
        Event::fake([PasswordReset::class]);
        $user = $this->account(['password' => 'old-secret-password', 'remember_token' => 'old-remember-token']);
        $other = $this->account();
        $user->createToken('phone');
        $user->createToken('desktop');
        $other->createToken('other-account');
        foreach ([$user, $other] as $account) {
            DB::table('sessions')->insert([
                'id' => 'session-'.$account->id, 'user_id' => $account->id,
                'payload' => '', 'last_activity' => now()->timestamp,
            ]);
        }
        $credentials = $this->credentials($user);

        $this->postJson('/api/reset-password', $credentials)->assertOk()->assertJsonMissingPath('token')->assertJsonMissingPath('user');
        $this->assertTrue(Hash::check($credentials['password'], $user->fresh()->password));
        $this->assertNotSame('old-remember-token', $user->fresh()->remember_token);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(1, $other->tokens()->count());
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseHas('sessions', ['user_id' => $other->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        Event::assertDispatched(PasswordReset::class, fn ($event) => $event->user->id === $user->id);

        $this->postJson('/api/reset-password', $credentials)->assertUnprocessable()->assertJsonPath('code', 'password_reset_invalid');
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'old-secret-password'])->assertUnprocessable();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => $credentials['password']])->assertOk()->assertJsonStructure(['token']);
    }

    public function test_expired_wrong_and_inactive_links_leave_credentials_and_sessions_intact(): void
    {
        $user = $this->account();
        $hash = $user->password;
        $user->createToken('still-valid');
        $credentials = $this->credentials($user);
        $this->travel(61)->minutes();
        $expired = $this->postJson('/api/reset-password', $credentials)->assertUnprocessable();
        $this->assertSame($hash, $user->fresh()->password);
        $this->assertSame(1, $user->tokens()->count());
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);

        $wrong = $this->postJson('/api/reset-password', $this->credentials($user, str_repeat('0', 64)))->assertUnprocessable();
        $unknown = $this->postJson('/api/reset-password', array_replace($credentials, ['email' => 'unknown@example.invalid']))->assertUnprocessable();
        $user->forceFill(['is_active' => false])->save();
        $disabled = $this->postJson('/api/reset-password', $this->credentials($user))->assertUnprocessable();
        $this->assertSame($expired->json(), $wrong->json());
        $this->assertSame($expired->json(), $unknown->json());
        $this->assertSame($expired->json(), $disabled->json());
        $this->assertSame($hash, $user->fresh()->password);
    }

    public function test_password_confirmation_length_and_link_validation_do_not_consume_token(): void
    {
        $user = $this->account();
        $credentials = $this->credentials($user);
        foreach ([
            ['password' => ['invalid'], 'password_confirmation' => ['invalid']],
            ['password_confirmation' => 'different'],
            ['password' => 'short', 'password_confirmation' => 'short'],
            ['password' => str_repeat('é', 37), 'password_confirmation' => str_repeat('é', 37)],
        ] as $invalid) {
            $this->postJson('/api/reset-password', array_replace($credentials, $invalid))->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->postJson('/api/reset-password', array_replace($credentials, ['token' => 'malformed']))->assertUnprocessable()->assertJsonValidationErrors('token');
        $this->assertTrue(Password::broker()->tokenExists($user, $credentials['token']));
    }

    public function test_invalid_reset_attempts_are_rate_limited(): void
    {
        $user = $this->account();
        $credentials = $this->credentials($user, str_repeat('0', 64));
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/reset-password', $credentials)->assertUnprocessable();
        }
        $this->postJson('/api/reset-password', $credentials)->assertStatus(429)->assertHeader('Retry-After');
    }

    public function test_link_uses_only_trusted_frontend_url_and_encodes_email_in_fragment(): void
    {
        config(['app.frontend_url' => 'https://tether.example/app/']);
        $user = $this->account(['email' => 'writer+test@example.invalid']);
        $this->withHeader('Host', 'untrusted.example')->postJson('/api/forgot-password', [
            'email' => $user->email, 'redirect' => 'https://untrusted.example',
        ])->assertAccepted();
        $notification = Notification::sent($user, PasswordResetLink::class)->first();
        $url = $notification->toMail($user)->actionUrl;
        $this->assertSame('tether.example', parse_url($url, PHP_URL_HOST));
        $this->assertSame('/app/reset-password', parse_url($url, PHP_URL_PATH));
        $this->assertNull(parse_url($url, PHP_URL_QUERY));
        parse_str(parse_url($url, PHP_URL_FRAGMENT), $parameters);
        $this->assertSame($user->email, $parameters['email']);
        $this->assertSame($notification->token, $parameters['token']);
        config(['app.frontend_url' => 'https://tether.example?redirect=bad']);
        $this->expectException(\LogicException::class);
        $notification->toMail($user);
    }

    public function test_delivery_is_queued_encrypted_and_stale_notifications_are_skipped(): void
    {
        $user = $this->account();
        $notification = new PasswordResetLink(Password::broker()->createToken($user));
        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertInstanceOf(ShouldBeEncrypted::class, $notification);
        $this->assertSame('database', $notification->connection);
        $this->assertSame('password-resets', $notification->queue);
        $this->assertTrue($notification->afterCommit);
        $job = (new SendQueuedNotifications($user, $notification, ['mail']))->onQueue('password-resets');
        // Inspect real queue serialization inside this test's rollback transaction.
        Queue::connection('database')->push($job->beforeCommit());
        $payload = DB::table('jobs')->value('payload');
        $this->assertStringNotContainsString($notification->token, $payload);
        $this->assertStringNotContainsString($user->email, $payload);
        $this->assertTrue($notification->shouldSend($user, 'mail'));
        $user->forceFill(['is_active' => false])->save();
        $this->assertFalse($notification->shouldSend($user, 'mail'));
        $user->forceFill(['is_active' => true])->save();
        $this->travel(61)->minutes();
        $this->assertFalse($notification->shouldSend($user, 'mail'));
        $this->travelBack();
        Password::broker()->deleteToken($user);
        $this->assertFalse($notification->shouldSend($user, 'mail'));
    }

    public function test_queue_failure_returns_private_response_without_sensitive_error_details(): void
    {
        $user = $this->account();
        Notification::shouldReceive('send')->once()->andThrow(new \RuntimeException('private-provider-details'));
        Log::spy();
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertAccepted()
            ->assertJsonMissingPath('exception')->assertDontSee('private-provider-details');
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        Log::shouldHaveReceived('error')->once()->with('Password reset email could not be queued.', [
            'exception_type' => \RuntimeException::class,
        ]);
    }
}
