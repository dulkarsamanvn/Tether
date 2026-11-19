<?php

namespace Tests\Feature;

use App\Models\LlmConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LlmModelsTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/llm-configurations/models';

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    public function test_discovery_requires_an_authenticated_active_account(): void
    {
        $this->postJson(self::URL)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['is_active' => false]));
        $this->postJson(self::URL)->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_each_provider_uses_a_fixed_url_and_header_key_and_returns_only_model_choices(): void
    {
        $this->login();
        $fixtures = [
            'openai' => ['https://api.openai.com/v1/models', ['data' => [['id' => 'gpt-5.4-mini', 'owned_by' => 'private detail']]], 'gpt-5.4-mini'],
            'gemini' => ['https://generativelanguage.googleapis.com/v1beta/models', ['models' => [
                ['name' => 'models/gemini-3.5-flash-lite', 'displayName' => 'Gemini Flash Lite', 'supportedGenerationMethods' => ['generateContent']],
                ['name' => 'models/embedding-model', 'supportedGenerationMethods' => ['embedContent']],
            ]], 'gemini-3.5-flash-lite'],
            'anthropic' => ['https://api.anthropic.com/v1/models', ['data' => [['id' => 'claude-haiku-5-5', 'display_name' => 'Claude Haiku']], 'has_more' => false], 'claude-haiku-5-5'],
            'grok' => ['https://api.x.ai/v1/language-models', ['models' => [
                ['id' => 'grok-4.7', 'input_modalities' => ['text', 'image'], 'output_modalities' => ['text']],
                ['id' => 'image-only', 'output_modalities' => ['image']],
            ]], 'grok-4.7'],
        ];
        Http::fake(fn (Request $request) => Http::response(collect($fixtures)->first(fn ($fixture) => str_starts_with($request->url(), $fixture[0]))[1]));
        foreach ($fixtures as $provider => [$url, $body, $id]) {
            $response = $this->postJson(self::URL, ['provider' => $provider, 'api_key' => 'unsaved-secret-key'])->assertOk()
                ->assertJsonCount(1, 'models')->assertJsonPath('models.0.id', $id)->assertJsonPath('truncated', false);
            $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
            $this->assertStringNotContainsString('unsaved-secret-key', $response->getContent());
            $this->assertStringNotContainsString('private detail', $response->getContent());
            Http::assertSent(fn (Request $request) => $request->method() === 'GET' && str_starts_with($request->url(), $url)
                && ! str_contains($request->url(), 'unsaved-secret-key')
                && $request->hasHeader($provider === 'gemini' ? 'x-goog-api-key' : 'Authorization', $provider === 'gemini' ? 'unsaved-secret-key' : 'Bearer unsaved-secret-key')
                && ($provider !== 'anthropic' || $request->hasHeader('anthropic-version', '2026-10-21')));
        }
        Http::assertSentCount(4);
        $this->assertDatabaseCount('llm_configurations', 0);
    }

    public function test_fetch_can_use_a_saved_key_without_changing_connection_or_revision(): void
    {
        $agent = $this->agent($this->login());
        $before = $agent->getAttributes();
        Http::fake(['api.openai.com/v1/models' => Http::response(['data' => [['id' => 'another-model']]])]);
        $this->postJson(self::URL, ['provider' => 'openai', 'configuration_id' => $agent->id])->assertOk()->assertJsonPath('models.0.id', 'another-model');
        Http::assertSent(fn (Request $request) => $request->hasHeader('Authorization', 'Bearer saved-secret-key'));
        $this->assertSame($before, $agent->fresh()->getAttributes());
    }

    public function test_replacement_key_is_used_for_discovery_without_overwriting_the_saved_key(): void
    {
        $agent = $this->agent($this->login());
        Http::fake(['api.openai.com/v1/models' => Http::response(['data' => []])]);
        $this->postJson(self::URL, ['provider' => 'openai', 'configuration_id' => $agent->id, 'api_key' => 'replacement-secret-key'])->assertOk();
        Http::assertSent(fn (Request $request) => $request->hasHeader('Authorization', 'Bearer replacement-secret-key'));
        $this->assertSame('saved-secret-key', $agent->fresh()->api_key);
    }

    public function test_foreign_saved_keys_and_provider_switches_cannot_reuse_credentials(): void
    {
        $agent = $this->agent(User::factory()->create());
        $this->login();
        foreach ([[], ['api_key' => 'new-secret-key']] as $extra) {
            $this->postJson(self::URL, ['provider' => 'openai', 'configuration_id' => $agent->id, ...$extra])->assertNotFound();
        }
        $own = $this->agent(auth()->user());
        $this->postJson(self::URL, ['provider' => 'gemini', 'configuration_id' => $own->id])->assertUnprocessable()->assertJsonValidationErrors('api_key');
        Http::assertNothingSent();
    }

    public function test_validation_prevents_missing_keys_invalid_providers_and_header_injection(): void
    {
        $this->login();
        foreach ([[], ['provider' => 'custom', 'api_key' => 'valid-length-key'], ['provider' => 'openai'], ['provider' => 'openai', 'api_key' => "secret-key\ninjected"], ['provider' => 'openai', 'api_key' => 'short'], ['provider' => 'openai', 'configuration_id' => '../1']] as $input) {
            $this->postJson(self::URL, $input)->assertUnprocessable();
        }
        Http::assertNothingSent();
    }

    public function test_gemini_pagination_normalizes_deduplicates_and_sorts_models(): void
    {
        $this->login();
        Http::fakeSequence()->push(['models' => [
            ['name' => 'models/z-model', 'supportedGenerationMethods' => ['generateContent']],
            ['name' => 'models/../invalid', 'supportedGenerationMethods' => ['generateContent']],
        ], 'nextPageToken' => 'next-token'])->push(['models' => [
            ['name' => 'models/a-model', 'displayName' => '<b>Model A</b>', 'supportedGenerationMethods' => ['generateContent']],
            ['name' => 'models/z-model', 'supportedGenerationMethods' => ['generateContent']],
        ]]);
        $this->postJson(self::URL, ['provider' => 'gemini', 'api_key' => 'unsaved-secret-key'])->assertExactJson([
            'models' => [['id' => 'a-model', 'name' => 'Model A'], ['id' => 'z-model', 'name' => 'z-model']], 'truncated' => false,
        ]);
        Http::assertSent(fn (Request $request) => ($request['pageToken'] ?? null) === 'next-token' && $request['pageSize'] === 1000);
        Http::assertSentCount(2);
    }

    public function test_claude_pagination_is_bounded_when_the_provider_repeats_a_cursor(): void
    {
        $this->login();
        Http::fake(fn () => Http::response(['data' => [['id' => 'claude-haiku-5-5']], 'has_more' => true, 'last_id' => 'repeat']));
        $this->postJson(self::URL, ['provider' => 'anthropic', 'api_key' => 'unsaved-secret-key'])->assertOk()->assertJsonCount(1, 'models')->assertJsonPath('truncated', true);
        Http::assertSent(fn (Request $request) => ($request['after_id'] ?? null) === 'repeat' && $request['limit'] === 1000);
        Http::assertSentCount(2);
    }

    public function test_model_lists_are_capped_and_partial_results_are_marked(): void
    {
        $this->login();
        Http::fake(fn () => Http::response(['data' => array_map(fn ($id) => ['id' => "model-{$id}"], range(1, 1002))]));
        $this->postJson(self::URL, ['provider' => 'openai', 'api_key' => 'unsaved-secret-key'])->assertOk()->assertJsonCount(1000, 'models')->assertJsonPath('truncated', true);
        Http::assertSentCount(1);
    }

    public function test_malformed_lists_timeouts_and_saved_key_decryption_failures_are_safe(): void
    {
        $agent = $this->agent($this->login());
        Http::fakeSequence()->push('not json')->push(['data' => 'not a list']);
        for ($i = 0; $i < 2; $i++) {
            $this->postJson(self::URL, ['provider' => 'openai', 'configuration_id' => $agent->id])->assertStatus(502)->assertJsonPath('code', 'ai_invalid_response');
        }
        DB::table('llm_configurations')->where('id', $agent->id)->update(['api_key' => 'corrupted-ciphertext']);
        $this->postJson(self::URL, ['provider' => 'openai', 'configuration_id' => $agent->id])->assertStatus(503)->assertJsonPath('code', 'ai_key_unavailable');
        Http::assertSentCount(2);
    }

    public function test_discovery_timeout_is_handled_without_leaking_the_request(): void
    {
        $this->login();
        Http::fake(fn () => throw new ConnectionException('unsaved-secret-key'));
        $response = $this->postJson(self::URL, ['provider' => 'grok', 'api_key' => 'unsaved-secret-key'])->assertStatus(504)->assertJsonPath('code', 'ai_timeout');
        $this->assertStringNotContainsString('unsaved-secret-key', $response->getContent());
    }

    public function test_discovery_is_limited_per_account_and_does_not_consume_connection_tests(): void
    {
        $agent = $this->agent($this->login());
        Http::fake(fn () => Http::response(['data' => []]));
        for ($i = 0; $i < 10; $i++) $this->postJson(self::URL, ['provider' => 'openai', 'configuration_id' => $agent->id])->assertOk();
        $this->postJson(self::URL, ['provider' => 'openai', 'configuration_id' => $agent->id])->assertTooManyRequests();
        // It reaches the generation client (and fails output validation), rather than being throttled.
        $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertStatus(502);
        $this->login();
        $this->postJson(self::URL, ['provider' => 'openai', 'api_key' => 'another-secret-key'])->assertOk();
    }

    public function test_discovery_daily_limit_applies_across_minutes(): void
    {
        $this->login();
        Http::fake(fn () => Http::response(['data' => []]));
        for ($i = 0; $i < 100; $i++) {
            $this->travel(61)->seconds();
            $this->postJson(self::URL, ['provider' => 'openai', 'api_key' => 'unsaved-secret-key'])->assertOk();
        }
        $this->travel(61)->seconds();
        $this->postJson(self::URL, ['provider' => 'openai', 'api_key' => 'unsaved-secret-key'])->assertTooManyRequests();
        Http::assertSentCount(100);
    }

    private function login(): User
    {
        $user = User::factory()->create(['is_active' => true]);
        Sanctum::actingAs($user);
        return $user;
    }

    private function agent(User $user): LlmConfiguration
    {
        $agent = $user->llmConfigurations()->create(['name' => 'Saved agent', 'provider' => 'openai', 'model' => 'gpt-5.4-mini', 'api_key' => 'saved-secret-key']);
        $agent->forceFill(['is_active' => true, 'status' => 'connected', 'revision' => 3])->save();
        return $agent->refresh();
    }
}
