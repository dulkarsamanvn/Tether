<?php

namespace App\Services;

use App\Exceptions\EditorialSuggestionException;
use Illuminate\Http\Client\Response;

class LlmProviderErrors
{
    public static function check(Response $response, string $provider, bool $listing = false): void
    {
        if ($response->successful()) return;

        // Classify upstream details locally. Never return a provider's raw message or body.
        $data = $response->json();
        $codes = [];
        foreach (['error.code', 'error.type', 'error.status', 'code'] as $path) {
            $value = data_get($data, $path);
            if (is_string($value)) $codes[] = strtolower($value);
        }
        foreach (is_array(data_get($data, 'error.details')) ? $data['error']['details'] : [] as $detail) {
            if (is_string(data_get($detail, 'reason'))) $codes[] = strtolower($detail['reason']);
        }
        $has = fn (array $values) => (bool) array_intersect($codes, $values);
        $message = data_get($data, 'error.message', data_get($data, 'error'));
        $message = is_string($message) ? strtolower($message) : '';
        $status = $response->status();

        if ($status === 401 || $has(['invalid_api_key', 'authentication_error', 'authentication', 'unauthenticated', 'api_key_invalid', 'api_key_expired'])
            || ($status === 400 && preg_match('/api key (not valid|is invalid|is incorrect)|incorrect api key|invalid api key/', $message))) {
            self::fail('The provider rejected this API key. Replace it in LLM Configuration and try again.', 'ai_auth_error');
        }
        if ($has(['quota_exceeded', 'organization_usage_limit_exceeded', 'daily_quota_exceeded'])) {
            self::fail('The provider usage quota was reached. Wait for the quota to reset or request a higher limit in your provider account.', 'ai_quota_error');
        }
        if ($status === 402 || $has(['billing_error', 'payment_required', 'insufficient_credits', 'credit_balance_exhausted', 'credit_balance_too_low', 'insufficient_quota', 'billing_hard_limit_reached', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded'])
            || (in_array($provider, ['anthropic', 'grok'], true) && in_array($status, [400, 403, 429], true)
                && preg_match('/credit balance|insufficient credits|out of credits|does not have (any )?credits|spend limit|spending limit/', $message))) {
            self::fail('The provider has no usable credits or its spending limit was reached. Check billing and limits in your provider account before trying again.', 'ai_billing_error');
        }
        if ($has(['model_not_found', 'model_not_available', 'model_access_denied']) || ($status === 404 && ! $listing)) {
            self::fail('This model was not found or is unavailable to your API key. Fetch models again or check the model ID and access permissions.', 'ai_model_error');
        }
        if ($status === 403 || $has(['permission_error', 'permission_denied', 'api_key_service_blocked', 'api_key_ip_address_blocked', 'api_key_http_referrer_blocked'])) {
            self::fail('The provider denied access. Check API key restrictions, model permissions, and your provider project settings.', 'ai_permission_error');
        }
        // Gemini's generic RESOURCE_EXHAUSTED can mean a daily quota or a short-term limit.
        if ($status === 429 && $provider === 'gemini' && $has(['resource_exhausted'])) {
            self::fail('Gemini reached a request or usage quota. Check your project quotas and reset times before trying again.', 'ai_quota_error');
        }
        if ($status === 429) {
            self::fail('The provider rate limit was reached. Wait a moment before trying again, or check your provider rate limits.', 'ai_rate_limit');
        }
        if (in_array($status, [400, 422], true) && ! $listing) {
            self::fail('The model rejected the suggestion request. Choose a text model with structured JSON output support, then reconnect.', 'ai_model_error');
        }
        if ($listing && in_array($status, [400, 404, 405, 422], true)) {
            self::fail('The provider could not list models. Check the key permissions or enter a model ID manually.', 'ai_models_unavailable');
        }
        self::fail('The AI provider is temporarily unavailable. Please try again later.', 'ai_unavailable');
    }

    private static function fail(string $message, string $code): never
    {
        throw new EditorialSuggestionException($message, $code, 503);
    }
}
