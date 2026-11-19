<?php

namespace Tests\Feature;

use App\Exceptions\EditorialSuggestionException;
use App\Services\LlmProviderErrors;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LlmProviderErrorsTest extends TestCase
{
    #[DataProvider('providerErrors')]
    public function test_errors_are_classified_without_exposing_upstream_details(string $provider, int $status, array $error, string $code): void
    {
        $error['message'] = $error['message'] ?? 'Sensitive upstream detail containing secret-api-key';
        $response = new Response(Http::response(['error' => $error], $status)->wait());
        foreach ([false, true] as $listing) {
            try {
                LlmProviderErrors::check($response, $provider, $listing);
                $this->fail('Expected a safe provider exception.');
            } catch (EditorialSuggestionException $failure) {
                $this->assertSame($code, $failure->errorCode);
                $this->assertSame(503, $failure->status);
                $this->assertStringNotContainsString('secret-api-key', $failure->getMessage());
                $this->assertStringNotContainsString('Sensitive upstream detail', $failure->getMessage());
            }
        }
    }

    public static function providerErrors(): array
    {
        return [
            'OpenAI invalid key' => ['openai', 401, ['code' => 'invalid_api_key'], 'ai_auth_error'],
            'Gemini invalid key at HTTP 400' => ['gemini', 400, ['status' => 'INVALID_ARGUMENT', 'details' => [['reason' => 'API_KEY_INVALID']]], 'ai_auth_error'],
            'Grok invalid key at HTTP 400' => ['grok', 400, ['message' => 'Incorrect API key: secret-api-key'], 'ai_auth_error'],
            'OpenAI exhausted credits' => ['openai', 429, ['type' => 'insufficient_quota'], 'ai_billing_error'],
            'OpenAI spending limit' => ['openai', 429, ['code' => 'project_spend_limit_exceeded'], 'ai_billing_error'],
            'OpenAI usage limit with generic quota type' => ['openai', 429, ['code' => 'organization_usage_limit_exceeded', 'type' => 'insufficient_quota'], 'ai_quota_error'],
            'Claude credits at HTTP 400' => ['anthropic', 400, ['type' => 'invalid_request_error', 'message' => 'Your credit balance is too low. secret-api-key'], 'ai_billing_error'],
            'Claude billing status' => ['anthropic', 402, ['type' => 'billing_error'], 'ai_billing_error'],
            'Grok billing permission status' => ['grok', 403, ['message' => 'Your team is out of credits: secret-api-key'], 'ai_billing_error'],
            'Gemini prepay balance' => ['gemini', 402, [], 'ai_billing_error'],
            'OpenAI missing model' => ['openai', 404, ['code' => 'model_not_found'], 'ai_model_error'],
            'OpenAI model access' => ['openai', 403, ['code' => 'model_not_found'], 'ai_model_error'],
            'Gemini key restriction' => ['gemini', 403, ['details' => [['reason' => 'API_KEY_SERVICE_BLOCKED']]], 'ai_permission_error'],
            'Claude workspace permission' => ['anthropic', 403, ['type' => 'permission_error'], 'ai_permission_error'],
            'Grok team permission' => ['grok', 403, [], 'ai_permission_error'],
            'OpenAI request limit' => ['openai', 429, ['code' => 'rate_limit_exceeded'], 'ai_rate_limit'],
            'Claude request limit' => ['anthropic', 429, ['type' => 'rate_limit_error'], 'ai_rate_limit'],
            'Grok request limit' => ['grok', 429, [], 'ai_rate_limit'],
            'Gemini ambiguous quota' => ['gemini', 429, ['status' => 'RESOURCE_EXHAUSTED'], 'ai_quota_error'],
            'Gemini daily quota' => ['gemini', 429, ['code' => 'quota_exceeded'], 'ai_quota_error'],
            'Provider unavailable' => ['openai', 500, [], 'ai_unavailable'],
        ];
    }
}
