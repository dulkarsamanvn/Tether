<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EditorialSuggestionTest extends TestCase
{
    use RefreshDatabase;

    private const CONTENT = 'A practical guide to building a small Laravel application with clear routes, models, controllers, and useful tests.';
    private const SUGGESTIONS = ['titles' => ['Build a Small Laravel Application', 'A Practical Guide to Laravel', 'Laravel Routes, Models, and Tests'], 'excerpt' => 'Learn how to build a small Laravel application using clear routes, focused models, controllers, and useful tests.'];

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    public function test_only_authenticated_active_authors_can_request_suggestions(): void
    {
        $this->postJson('/api/editor/suggestions', $this->input())->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['is_active' => false]));
        $this->postJson('/api/editor/suggestions', $this->input())->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_suggestions_use_submitted_text_and_never_save_or_publish_a_blog(): void
    {
        $author = $this->author();
        $blog = $author->blogs()->create(['title' => 'Original title', 'slug' => 'original', 'content' => 'Private saved version', 'excerpt' => 'Original excerpt', 'status' => 'published', 'published_at' => now()]);
        $before = $blog->refresh()->getAttributes();
        Sanctum::actingAs($author);
        Http::fake(['api.openai.com/v1/responses' => Http::response($this->providerResponse())]);
        $this->postJson('/api/editor/suggestions', $this->input())->assertOk()->assertExactJson(self::SUGGESTIONS);
        Http::assertSent(fn (Request $request) => $request->url() === 'https://api.openai.com/v1/responses'
            && $request->hasHeader('Authorization', 'Bearer test-only-secret')
            && $request['model'] === 'gpt-5.4-mini' && $request['store'] === false
            && $request['max_output_tokens'] === 1000 && $request['text']['format']['strict'] === true
            && json_decode($request['input'], true) === ['current_title' => 'Working title', 'draft_text' => self::CONTENT]
            && ! str_contains($request['input'], $author->email) && ! str_contains($request['input'], 'Private saved version'));
        Http::assertSentCount(1);
        $this->assertSame($before, $blog->fresh()->getAttributes());
        $this->assertDatabaseCount('blogs', 1);
    }

    public function test_an_account_without_a_connected_agent_does_not_use_an_environment_key(): void
    {
        Sanctum::actingAs(User::factory()->create(['is_active' => true]));
        config(['services.openai.api_key' => 'server-key-must-not-be-used']);
        $this->postJson('/api/editor/suggestions', $this->input())->assertStatus(503)->assertJsonPath('code', 'ai_not_configured');
        Http::assertNothingSent();
    }

    public function test_input_validation_prevents_empty_and_oversized_requests(): void
    {
        Sanctum::actingAs($this->author());
        foreach ([[], ['content' => 'short'], ['content' => str_repeat(' ', 100)], ['content' => ['bad']], ['content' => str_repeat('a', 20001)], [...$this->input(), 'title' => str_repeat('a', 256)]] as $input) {
            // Validation attempts also count toward the per-minute request limit.
            $this->travel(61)->seconds();
            $this->postJson('/api/editor/suggestions', $input)->assertUnprocessable();
        }
        Http::assertNothingSent();
    }

    public function test_an_existing_title_is_optional_and_whitespace_is_normalized(): void
    {
        Sanctum::actingAs($this->author());
        Http::fake(['api.openai.com/v1/responses' => Http::response($this->providerResponse())]);
        $this->postJson('/api/editor/suggestions', ['content' => "  ".self::CONTENT."\n\n "])->assertOk();
        Http::assertSent(fn (Request $request) => json_decode($request['input'], true) === ['current_title' => '', 'draft_text' => self::CONTENT]);
    }

    public function test_provider_errors_are_safe_and_do_not_expose_credentials_or_response_bodies(): void
    {
        Sanctum::actingAs($this->author());
        $sequence = Http::fakeSequence();
        foreach ([401, 429, 500] as $status) $sequence->push(['error' => ['message' => 'test-only-secret: upstream sensitive detail']], $status);
        foreach ([401 => 'ai_auth_error', 429 => 'ai_rate_limit', 500 => 'ai_unavailable'] as $status => $code) {
            $response = $this->postJson('/api/editor/suggestions', $this->input())->assertStatus(503)->assertJsonPath('code', $code);
            $this->assertStringNotContainsString('test-only-secret', $response->getContent());
            $this->assertStringNotContainsString('upstream sensitive detail', $response->getContent());
        }
    }

    public function test_timeouts_return_a_retryable_error(): void
    {
        Sanctum::actingAs($this->author());
        Http::fake(fn () => throw new ConnectionException('Sensitive request details'));
        $this->postJson('/api/editor/suggestions', $this->input())->assertStatus(504)->assertJsonPath('code', 'ai_timeout');
    }

    public function test_refusals_and_incomplete_responses_are_not_applied_as_suggestions(): void
    {
        Sanctum::actingAs($this->author());
        Http::fakeSequence()->push(['status' => 'incomplete', 'output' => []])->push([
            'status' => 'completed', 'output' => [['type' => 'message', 'role' => 'assistant', 'content' => [['type' => 'refusal', 'refusal' => 'Upstream refusal']]]],
        ]);
        $this->postJson('/api/editor/suggestions', $this->input())->assertStatus(502)->assertJsonPath('code', 'ai_invalid_response');
        $this->postJson('/api/editor/suggestions', $this->input())->assertUnprocessable()->assertJsonPath('code', 'ai_refused');
    }

    public function test_invalid_output_is_rejected_instead_of_leaking_or_truncating_it(): void
    {
        Sanctum::actingAs($this->author());
        $sequence = Http::fakeSequence();
        foreach ([['titles' => ['One'], 'excerpt' => 'Summary'], ['titles' => ['Same', ' same ', 'Other'], 'excerpt' => 'Summary'], [...self::SUGGESTIONS, 'excerpt' => str_repeat('a', 301)], [...self::SUGGESTIONS, 'excerpt' => '<br>'], [...self::SUGGESTIONS, 'unexpected' => 'value']] as $invalid) $sequence->push($this->providerResponse($invalid));
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/editor/suggestions', $this->input())->assertStatus(502)->assertJsonPath('code', 'ai_invalid_response');
        }
    }

    public function test_non_json_provider_output_is_handled(): void
    {
        Sanctum::actingAs($this->author());
        $response = $this->providerResponse();
        $response['output'][1]['content'][0]['text'] = 'not json';
        Http::fake(['api.openai.com/v1/responses' => Http::response($response)]);
        $this->postJson('/api/editor/suggestions', $this->input())->assertStatus(502)->assertJsonPath('code', 'ai_invalid_response');
    }

    public function test_minute_limit_is_per_account(): void
    {
        Http::fake(['api.openai.com/v1/responses' => Http::response($this->providerResponse())]);
        Sanctum::actingAs($this->author());
        for ($i = 0; $i < 5; $i++) $this->postJson('/api/editor/suggestions', $this->input())->assertOk();
        $this->postJson('/api/editor/suggestions', $this->input())->assertTooManyRequests()->assertHeader('Retry-After');
        Sanctum::actingAs($this->author());
        $this->postJson('/api/editor/suggestions', $this->input())->assertOk();
        Http::assertSentCount(6);
    }

    public function test_daily_limit_survives_minute_resets(): void
    {
        Http::fake(['api.openai.com/v1/responses' => Http::response($this->providerResponse())]);
        Sanctum::actingAs($this->author());
        for ($i = 0; $i < 50; $i++) {
            if ($i % 5 === 0) $this->travel(61)->seconds();
            $this->postJson('/api/editor/suggestions', $this->input())->assertOk();
        }
        $this->travel(61)->seconds();
        $this->postJson('/api/editor/suggestions', $this->input())->assertTooManyRequests();
        Http::assertSentCount(50);
    }

    private function input(): array
    {
        return ['title' => 'Working title', 'content' => self::CONTENT];
    }

    private function author(): User
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->llmConfigurations()->create(['name' => 'Test agent', 'provider' => 'openai', 'model' => 'gpt-5.4-mini', 'api_key' => 'test-only-secret'])
            ->forceFill(['status' => 'connected', 'is_active' => true])->save();
        return $user;
    }

    private function providerResponse(?array $suggestions = null): array
    {
        return ['status' => 'completed', 'output' => [
            ['type' => 'reasoning', 'summary' => []],
            ['type' => 'message', 'role' => 'assistant', 'content' => [['type' => 'output_text', 'text' => json_encode($suggestions ?? self::SUGGESTIONS)]]],
        ]];
    }
}
