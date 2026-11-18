<?php

namespace Tests\Feature;

use App\Models\LlmConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LlmConfigurationTest extends TestCase
{
    use RefreshDatabase;

    private const RESULT = ['titles' => ['A Shared Community Garden', 'Growing Together', 'Neighbors Share the Harvest'], 'excerpt' => 'Neighbors grow tomatoes, herbs, and flowers in a shared garden, watering together and sharing their harvest.'];
    private const CONTENT = 'Neighbors planted a shared garden with tomatoes, herbs, and flowers. They water it together each weekend and share the harvest with their community.';

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    public function test_configuration_endpoints_require_an_active_authenticated_account(): void
    {
        foreach ([['GET', '/api/llm-configurations'], ['GET', '/api/llm-configurations/active'], ['POST', '/api/llm-configurations'], ['PUT', '/api/llm-configurations/1'], ['POST', '/api/llm-configurations/1/connect'], ['POST', '/api/llm-configurations/1/disconnect'], ['DELETE', '/api/llm-configurations/1']] as [$method, $url]) {
            $this->json($method, $url)->assertUnauthorized();
        }
        Sanctum::actingAs(User::factory()->create(['is_active' => false]));
        $this->getJson('/api/llm-configurations')->assertForbidden();
        $this->postJson('/api/llm-configurations', $this->input())->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_saved_keys_are_encrypted_hidden_and_never_returned_to_the_browser(): void
    {
        $user = $this->reader();
        $other = User::factory()->create();
        $response = $this->postJson('/api/llm-configurations', [...$this->input(), 'user_id' => $other->id, 'is_active' => true, 'status' => 'connected', 'revision' => 50])
            ->assertCreated()->assertJsonPath('configurations.0.status', 'untested')->assertJsonPath('configurations.0.has_api_key', true)
            ->assertJsonPath('configurations.0.revision', 1)->assertJsonPath('active_configuration_id', null);
        $agent = $user->llmConfigurations()->firstOrFail();
        $raw = DB::table('llm_configurations')->where('id', $agent->id)->value('api_key');
        $this->assertNotSame('test-secret-key', $raw);
        $this->assertStringNotContainsString('test-secret-key', $raw);
        $this->assertSame('test-secret-key', $agent->api_key);
        $this->assertArrayNotHasKey('api_key', $agent->toArray());
        $this->assertStringNotContainsString('test-secret-key', $response->getContent());
        $this->assertArrayNotHasKey('api_key', $response->json('configurations.0'));
        $this->getJson('/api/llm-configurations')->assertOk()->assertJsonCount(1, 'configurations')->assertJsonCount(4, 'providers')->assertJsonPath('providers.3.id', 'grok');
        $this->getJson('/api/llm-configurations/active')->assertOk()->assertExactJson(['configuration' => null]);
        Http::assertNothingSent();
    }

    public function test_accounts_cannot_read_change_connect_disconnect_or_delete_each_others_agents(): void
    {
        $owner = User::factory()->create();
        $agent = $this->agent($owner);
        $this->reader();
        $this->getJson('/api/llm-configurations')->assertOk()->assertJsonCount(0, 'configurations');
        $this->getJson('/api/llm-configurations/active')->assertExactJson(['configuration' => null]);
        $this->putJson("/api/llm-configurations/{$agent->id}", $this->input())->assertNotFound();
        $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertNotFound();
        $this->postJson("/api/llm-configurations/{$agent->id}/disconnect")->assertNotFound();
        $this->deleteJson("/api/llm-configurations/{$agent->id}")->assertNotFound();
        $this->assertSame('test-secret-key', $agent->fresh()->api_key);
        Http::assertNothingSent();
    }

    public function test_an_empty_key_keeps_the_saved_key_and_credential_changes_require_reconnection(): void
    {
        $user = $this->reader();
        $agent = $this->agent($user);
        $encrypted = $agent->getRawOriginal('api_key');
        $this->putJson("/api/llm-configurations/{$agent->id}", [...$this->input(), 'name' => 'Renamed agent', 'api_key' => '', 'instructions' => 'Use a friendly tone.'])
            ->assertOk()->assertJsonPath('configurations.0.is_active', true)->assertJsonPath('configurations.0.revision', 2);
        $this->assertSame($encrypted, $agent->fresh()->getRawOriginal('api_key'));
        $this->putJson("/api/llm-configurations/{$agent->id}", [...$this->input(), 'model' => 'another-model', 'api_key' => ''])
            ->assertOk()->assertJsonPath('configurations.0.status', 'untested')->assertJsonPath('active_configuration_id', null);
        $this->assertSame('test-secret-key', $agent->fresh()->api_key);
        $this->putJson("/api/llm-configurations/{$agent->id}", [...$this->input(), 'provider' => 'gemini', 'api_key' => ''])->assertUnprocessable()->assertJsonValidationErrors('api_key');
        Http::assertNothingSent();
    }

    public function test_api_key_replacement_is_encrypted_and_resets_connection(): void
    {
        $user = $this->reader();
        $agent = $this->agent($user);
        $response = $this->putJson("/api/llm-configurations/{$agent->id}", [...$this->input(), 'api_key' => 'replacement-secret-key'])
            ->assertOk()->assertJsonPath('configurations.0.status', 'untested')->assertJsonPath('configurations.0.tested_at', null);
        $this->assertSame('replacement-secret-key', $agent->fresh()->api_key);
        $this->assertStringNotContainsString('replacement-secret-key', $response->getContent());
    }

    public function test_each_provider_connects_and_routes_suggestions_using_its_own_model_and_key(): void
    {
        $user = $this->reader();
        foreach (array_keys(LlmConfiguration::PROVIDERS) as $provider) {
            $agent = $user->llmConfigurations()->create([...$this->input(), 'name' => "Agent {$provider}", 'provider' => $provider, 'model' => LlmConfiguration::PROVIDERS[$provider]['default_model'], 'api_key' => "secret-for-{$provider}", 'instructions' => 'Write warmly.']);
            Http::fake([$this->url($provider) => Http::response($this->providerResponse($provider))]);
            $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertOk()->assertJsonPath('active_configuration_id', $agent->id);
            $this->assertSame(1, $user->llmConfigurations()->where('is_active', true)->count());
            $active = $this->getJson('/api/llm-configurations/active')->assertOk()->assertJsonPath('configuration.id', $agent->id)->json('configuration');
            $this->assertArrayNotHasKey('api_key', $active);
            $this->postJson('/api/editor/suggestions', ['content' => self::CONTENT, 'configuration_id' => $agent->id, 'configuration_revision' => $active['revision']])
                ->assertOk()->assertExactJson(self::RESULT);
            Http::assertSent(function (Request $request) use ($provider, $agent) {
                if ($request->url() !== $this->url($provider)) return false;
                if ($provider === 'gemini') return $request->hasHeader('x-goog-api-key', "secret-for-{$provider}") && str_contains($request['systemInstruction']['parts'][0]['text'], 'Write warmly.') && isset($request['generationConfig']['responseJsonSchema']);
                if ($provider === 'grok') return $request->hasHeader('Authorization', 'Bearer secret-for-grok')
                    && $request['model'] === 'grok-4.7' && $request['store'] === false
                    && $request['max_output_tokens'] === 2000 && $request['reasoning']['effort'] === 'low'
                    && $request['text']['format']['strict'] === true
                    && str_contains($request['input'][0]['content'], 'Write warmly.')
                    && isset(json_decode($request['input'][1]['content'], true)['draft_text']);
                return $request->hasHeader('Authorization', "Bearer secret-for-{$provider}") && $request['model'] === $agent->model
                    && ($provider === 'openai' ? $request['store'] === false : $request->hasHeader('anthropic-version', '2026-10-21'));
            });
        }
    }

    public function test_failed_connection_keeps_the_previous_active_agent_and_hides_upstream_errors(): void
    {
        $user = $this->reader();
        $active = $this->agent($user);
        $new = $user->llmConfigurations()->create([...$this->input(), 'name' => 'New agent']);
        Http::fake(['api.openai.com/*' => Http::response(['error' => ['message' => 'test-secret-key raw provider detail']], 401)]);
        $response = $this->postJson("/api/llm-configurations/{$new->id}/connect")->assertStatus(503)
            ->assertJsonPath('active_configuration_id', $active->id)->assertJsonPath('code', 'ai_auth_error');
        $this->assertSame('error', $new->fresh()->status);
        $this->assertStringNotContainsString('test-secret-key', $response->getContent());
        $this->assertStringNotContainsString('raw provider detail', $new->fresh()->last_error);
    }

    public function test_a_configuration_edited_during_connection_cannot_be_activated_by_an_old_response(): void
    {
        $user = $this->reader();
        $agent = $user->llmConfigurations()->create($this->input());
        Http::fake(function () use ($agent) {
            $agent->forceFill(['revision' => 2, 'model' => 'updated-model'])->save();
            return Http::response($this->providerResponse('openai'));
        });
        $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertConflict();
        $this->assertFalse($agent->fresh()->is_active);
        $this->assertSame('untested', $agent->fresh()->status);
    }

    public function test_stale_or_foreign_editor_configuration_ids_are_rejected_before_sending_draft_text(): void
    {
        $user = $this->reader();
        $agent = $this->agent($user);
        foreach ([['configuration_id' => $agent->id + 100, 'configuration_revision' => 1], ['configuration_id' => $agent->id, 'configuration_revision' => 2]] as $expected) {
            $this->postJson('/api/editor/suggestions', ['content' => self::CONTENT, ...$expected])->assertConflict()->assertJsonPath('code', 'ai_configuration_changed');
        }
        Http::assertNothingSent();
    }

    public function test_bad_provider_outputs_cannot_create_a_connected_agent(): void
    {
        $user = $this->reader();
        $agent = $user->llmConfigurations()->create($this->input());
        Http::fake(['api.openai.com/*' => Http::response($this->providerResponse('openai', ['titles' => ['Only one'], 'excerpt' => 'Bad result']))]);
        $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertStatus(502)->assertJsonPath('active_configuration_id', null);
        $this->assertSame('error', $agent->fresh()->status);
    }

    public function test_gemini_and_anthropic_refusals_and_truncated_results_are_handled(): void
    {
        $user = $this->reader();
        $cases = [
            ['gemini', ['candidates' => [['finishReason' => 'SAFETY']]], 422],
            ['gemini', ['candidates' => [['finishReason' => 'MAX_TOKENS']]], 502],
            ['anthropic', ['stop_reason' => 'refusal'], 422],
            ['anthropic', ['stop_reason' => 'max_tokens'], 502],
        ];
        $sequence = Http::fakeSequence();
        foreach ($cases as [$provider, $response]) $sequence->push($response);
        foreach ($cases as $i => [$provider, $response, $status]) {
            $agent = $user->llmConfigurations()->create([...$this->input(), 'name' => "Case {$i}", 'provider' => $provider, 'model' => LlmConfiguration::PROVIDERS[$provider]['default_model']]);
            $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertStatus($status);
        }
    }

    public function test_disconnect_and_delete_remove_the_active_selection_and_account_deletion_cascades(): void
    {
        $user = $this->reader();
        $agent = $this->agent($user);
        $this->postJson("/api/llm-configurations/{$agent->id}/disconnect")->assertOk()->assertJsonPath('active_configuration_id', null);
        $this->assertSame('test-secret-key', $agent->fresh()->api_key);
        $this->assertSame(2, $agent->fresh()->revision);
        $this->deleteJson("/api/llm-configurations/{$agent->id}")->assertOk()->assertJsonCount(0, 'configurations');
        $this->assertDatabaseMissing('llm_configurations', ['id' => $agent->id]);
        $this->agent($user);
        $user->delete();
        $this->assertDatabaseCount('llm_configurations', 0);
    }

    public function test_grok_connection_errors_refusals_and_incomplete_results_keep_the_previous_agent(): void
    {
        $user = $this->reader();
        $active = $this->agent($user);
        $sequence = Http::fakeSequence()
            ->push(['error' => 'secret-grok-key upstream detail'], 401)
            ->push(['error' => 'Provider quota'], 429)
            ->push(['status' => 'incomplete', 'output' => []])
            ->push(['status' => 'completed', 'output' => [['type' => 'message', 'role' => 'assistant', 'content' => [['type' => 'refusal', 'refusal' => 'Raw refusal']]]]]);
        foreach ([[503, 'ai_auth_error'], [503, 'ai_busy'], [502, 'ai_invalid_response'], [422, 'ai_refused']] as $i => [$status, $code]) {
            $agent = $user->llmConfigurations()->create([...$this->input(), 'name' => "Grok {$i}", 'provider' => 'grok', 'model' => 'grok-4.7', 'api_key' => 'secret-grok-key']);
            $response = $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertStatus($status)
                ->assertJsonPath('code', $code)->assertJsonPath('active_configuration_id', $active->id);
            $this->assertStringNotContainsString('secret-grok-key', $response->getContent());
            $this->assertStringNotContainsString('upstream detail', $response->getContent());
        }
        Http::assertSentCount(4);
    }

    public function test_validation_restricts_providers_model_paths_keys_and_names(): void
    {
        $user = $this->reader();
        foreach ([['provider' => 'custom'], ['model' => '../bad/path'], ['model' => 'https://example.invalid'], ['api_key' => "bad-key\nheader"], ['api_key' => ''], ['instructions' => str_repeat('x', 1001)]] as $invalid) {
            $this->postJson('/api/llm-configurations', [...$this->input(), ...$invalid])->assertUnprocessable();
        }
        for ($i = 0; $i < 10; $i++) $user->llmConfigurations()->create([...$this->input(), 'name' => "Agent {$i}"]);
        $this->postJson('/api/llm-configurations', $this->input())->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_a_missing_account_configuration_never_falls_back_to_another_accounts_agent(): void
    {
        $owner = User::factory()->create();
        $this->agent($owner);
        $this->reader();
        $this->postJson('/api/editor/suggestions', ['content' => self::CONTENT])->assertStatus(503)->assertJsonPath('code', 'ai_not_configured');
        Http::assertNothingSent();
    }

    public function test_unreadable_encrypted_keys_return_a_safe_replacement_message(): void
    {
        $user = $this->reader();
        $agent = $this->agent($user);
        DB::table('llm_configurations')->where('id', $agent->id)->update(['api_key' => 'invalid-ciphertext']);
        $this->getJson('/api/llm-configurations')->assertOk()->assertJsonPath('configurations.0.has_api_key', true);
        $this->postJson('/api/editor/suggestions', ['content' => self::CONTENT])->assertStatus(503)->assertJsonPath('code', 'ai_key_unavailable');
        Http::assertNothingSent();
    }

    public function test_daily_connection_limit_survives_minute_resets(): void
    {
        $user = $this->reader();
        $agent = $user->llmConfigurations()->create($this->input());
        Http::fake(['api.openai.com/*' => Http::response($this->providerResponse('openai'))]);
        for ($i = 0; $i < 20; $i++) {
            if ($i % 5 === 0) $this->travel(61)->seconds();
            $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertOk();
        }
        $this->travel(61)->seconds();
        $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertTooManyRequests();
        Http::assertSentCount(20);
    }

    public function test_connection_limits_are_per_account_and_distinct_from_editor_limits(): void
    {
        $user = $this->reader();
        $agent = $user->llmConfigurations()->create($this->input());
        Http::fake(['api.openai.com/*' => Http::response($this->providerResponse('openai'))]);
        for ($i = 0; $i < 5; $i++) $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertOk();
        $this->postJson("/api/llm-configurations/{$agent->id}/connect")->assertTooManyRequests();
        $this->postJson('/api/editor/suggestions', ['content' => self::CONTENT])->assertOk();
        $other = $this->reader();
        $otherAgent = $other->llmConfigurations()->create($this->input());
        $this->postJson("/api/llm-configurations/{$otherAgent->id}/connect")->assertOk();
    }

    private function reader(): User
    {
        $user = User::factory()->create(['is_active' => true]);
        Sanctum::actingAs($user);
        return $user;
    }

    private function agent(User $user): LlmConfiguration
    {
        $agent = $user->llmConfigurations()->create($this->input());
        $agent->forceFill(['is_active' => true, 'status' => 'connected'])->save();
        return $agent->refresh();
    }

    private function input(): array
    {
        return ['name' => 'My writer', 'provider' => 'openai', 'model' => 'gpt-5.4-mini', 'api_key' => 'test-secret-key', 'instructions' => ''];
    }

    private function url(string $provider): string
    {
        return match ($provider) {
            'openai' => 'https://api.openai.com/v1/responses',
            'gemini' => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
            'anthropic' => 'https://api.anthropic.com/v1/messages',
            'grok' => 'https://api.x.ai/v1/responses',
        };
    }

    private function providerResponse(string $provider, ?array $result = null): array
    {
        $json = json_encode($result ?? self::RESULT);
        return match ($provider) {
            'openai', 'grok' => ['status' => 'completed', 'output' => [['type' => 'reasoning', 'encrypted_content' => 'Private reasoning'], ['type' => 'message', 'role' => 'assistant', 'content' => [['type' => 'output_text', 'text' => $json]]]]],
            'gemini' => ['candidates' => [['finishReason' => 'STOP', 'content' => ['parts' => [['thought' => true, 'text' => 'Private reasoning'], ['text' => $json]]]]]],
            'anthropic' => ['role' => 'assistant', 'stop_reason' => 'end_turn', 'content' => [['type' => 'text', 'text' => $json]]],
        };
    }
}
