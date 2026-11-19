<?php

namespace App\Services;

use App\Exceptions\EditorialSuggestionException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class LlmModels
{
    public function discover(string $provider, string $key): array
    {
        $url = match ($provider) {
            'openai' => 'https://api.openai.com/v1/models',
            'gemini' => 'https://generativelanguage.googleapis.com/v1beta/models',
            'anthropic' => 'https://api.anthropic.com/v1/models',
            'grok' => 'https://api.x.ai/v1/language-models',
        };
        $models = [];
        $cursor = null;
        $seen = [];
        $deadline = microtime(true) + 25;
        $truncated = false;
        for ($page = 0; $page < 5; $page++) {
            $remaining = $deadline - microtime(true);
            if ($remaining < 1) { $truncated = true; break; }
            $http = Http::acceptJson()->connectTimeout(min(5, $remaining))->timeout(min(10, $remaining))->withoutRedirecting();
            $http = $provider === 'gemini' ? $http->withHeaders(['x-goog-api-key' => $key]) : $http->withToken($key);
            if ($provider === 'anthropic') $http->withHeaders(['anthropic-version' => '2026-10-21']);
            $query = match ($provider) {
                'gemini' => ['pageSize' => 1000, ...($cursor ? ['pageToken' => $cursor] : [])],
                'anthropic' => ['limit' => 1000, ...($cursor ? ['after_id' => $cursor] : [])],
                default => [],
            };
            try {
                $response = $http->get($url, $query);
            } catch (ConnectionException) {
                throw new EditorialSuggestionException('Fetching models timed out. Try again or enter a model ID manually.', 'ai_timeout', 504);
            }
            LlmProviderErrors::check($response, $provider, listing: true);
            $data = $response->json();
            $items = data_get($data, in_array($provider, ['gemini', 'grok'], true) ? 'models' : 'data');
            if (! is_array($items) || ! array_is_list($items)) $this->invalidResponse();
            foreach ($items as $item) {
                if (! is_array($item)) continue;
                if ($provider === 'gemini' && ! in_array('generateContent', (array) ($item['supportedGenerationMethods'] ?? []), true)) continue;
                if ($provider === 'grok' && isset($item['output_modalities']) && ! in_array('text', (array) $item['output_modalities'], true)) continue;
                $id = $provider === 'gemini' ? ($item['name'] ?? null) : ($item['id'] ?? null);
                if (! is_string($id)) continue;
                if ($provider === 'gemini') $id = preg_replace('/^models\//', '', $id);
                if (! preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/D', $id)) continue;
                $label = $item['displayName'] ?? $item['display_name'] ?? $id;
                $label = is_string($label) ? mb_substr(trim(strip_tags($label)), 0, 160) : $id;
                $models[$id] = ['id' => $id, 'name' => $label ?: $id];
                if (count($models) >= 1000) { $truncated = true; break; }
            }
            if ($provider === 'anthropic' && ! empty($data['has_more']) && empty($data['last_id'])) $this->invalidResponse();
            $cursor = match ($provider) {
                'gemini' => $data['nextPageToken'] ?? null,
                'anthropic' => ! empty($data['has_more']) ? ($data['last_id'] ?? null) : null,
                default => null,
            };
            if (! $cursor) break;
            if (! is_string($cursor) || strlen($cursor) > 4096) $this->invalidResponse();
            if ($truncated || isset($seen[$cursor]) || $page === 4) { $truncated = true; break; }
            $seen[$cursor] = true;
        }
        ksort($models, SORT_NATURAL | SORT_FLAG_CASE);
        return ['models' => array_values($models), 'truncated' => $truncated];
    }

    private function invalidResponse(): never
    {
        throw new EditorialSuggestionException('The provider returned an invalid model list. Try again or enter a model ID manually.', 'ai_invalid_response');
    }
}
