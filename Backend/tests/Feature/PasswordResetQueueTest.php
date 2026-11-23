<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\PasswordResetLink;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetQueueTest extends TestCase
{
    use DatabaseMigrations;

    public function test_request_commits_an_encrypted_job_and_worker_renders_mail_without_smtp(): void
    {
        config(['mail.default' => 'array', 'app.frontend_url' => 'https://tether.example']);
        $user = User::factory()->create(['is_active' => true]);

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertAccepted();

        $this->assertDatabaseCount('jobs', 1);
        $queued = DB::table('jobs')->first();
        $this->assertSame('password-resets', $queued->queue);
        $payload = json_decode($queued->payload, true);
        $job = unserialize(Crypt::decrypt($payload['data']['command']));
        $this->assertInstanceOf(SendQueuedNotifications::class, $job);
        $this->assertInstanceOf(PasswordResetLink::class, $job->notification);
        $this->assertStringNotContainsString($job->notification->token, $queued->payload);
        $this->assertTrue(Password::broker()->tokenExists($user, $job->notification->token));
        $transport = app('mailer')->getSymfonyTransport();
        $this->assertCount(0, $transport->messages());

        $job->handle(app(ChannelManager::class));
        $this->assertCount(1, $transport->messages());
        $mail = $transport->messages()->first()->getOriginalMessage();
        $this->assertSame('Reset your Tether password', $mail->getSubject());
        $this->assertSame($user->email, $mail->getTo()[0]->getAddress());
        $this->assertStringContainsString('https://tether.example/reset-password#', $mail->getHtmlBody());

        Password::broker()->deleteToken($user);
        $job->handle(app(ChannelManager::class));
        $this->assertCount(1, $transport->messages(), 'A consumed token must not be emailed on retry.');
    }
}
