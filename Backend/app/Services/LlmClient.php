<?php

namespace App\Services;

use App\Exceptions\EditorialSuggestionException;
use App\Models\LlmConfiguration;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class LlmClient
{
    public function request(LlmConfiguration $agent, string $instructions, string $input, array $schema): string
    {
        try {
            $key = $agent->api_key;
        } catch (DecryptException) {
            throw new EditorialSuggestionException('This saved API key cannot be read. Replace it in LLM Configuration and reconnect.', 'ai_key_unavailable', 503);
        }
        $http = Http::acceptJson()->connectTimeout(5)->timeout(30)->withoutRedirecting();
        try {
            $response = match ($agent->provider) {
                'openai' => $http->withToken($key)->post('https://api.openai.com/v1/responses', [
                    'model' => $agent->model, 'store' => false, 'max_output_tokens' => 1000,
                    'instructions' => $instructions, 'input' => $input,
                    'text' => ['format' => ['type' => 'json_schema', 'name' => 'editorial_suggestions', 'strict' => true, 'schema' => $schema]],
                ]),
                'gemini' => $http->withHeaders(['x-goog-api-key' => $key])->post('https://generativelanguage.googleapis.com/v1beta/models/'.rawurlencode($agent->model).':generateContent', [
                    'systemInstruction' => ['parts' => [['text' => $instructions]]],
                    'contents' => [['role' => 'user', 'parts' => [['text' => $input]]]],
                    'generationConfig' => ['maxOutputTokens' => 2048, 'responseMimeType' => 'application/json', 'responseJsonSchema' => $schema],
                ]),
                'anthropic' => $http->withToken($key)->withHeaders(['anthropic-version' => '2026-10-21'])->post('https://api.anthropic.com/v1/messages', [
                    'model' => $agent->model, 'max_tokens' => 1000, 'system' => $instructions,
                    'messages' => [['role' => 'user', 'content' => $input]],
                    'output_config' => ['format' => ['type' => 'json_schema', 'schema' => $schema]],
                ]),
            };
        } catch (ConnectionException) {
            throw new EditorialSuggestionException('The model took too long to respond. Please try again.', 'ai_timeout', 504);
        }
        if (in_array($response->status(), [401, 403], true)) {
            throw new EditorialSuggestionException('The provider rejected this API key. Check the key and permissions in LLM Configuration.', 'ai_auth_error', 503);
        }
        if (in_array($response->status(), [400, 404], true)) {
            throw new EditorialSuggestionException('The provider could not use this model. Check the model ID and its structured-output support.', 'ai_model_error', 503);
        }
        if ($response->status() === 429) {
            throw new EditorialSuggestionException('The provider has reached a quota or rate limit. Check your credits or try again later.', 'ai_busy', 503);
        }
        if (! $response->successful()) {
            throw new EditorialSuggestionException('The AI provider is temporarily unavailable. Please try again later.', 'ai_unavailable', 503);
        }
        $data = $response->json();
        if (! is_array($data)) $this->invalidResponse();
        return match ($agent->provider) {
            'openai' => $this->openaiText($data), 'gemini' => $this->geminiText($data), 'anthropic' => $this->anthropicText($data),
        };
    }

    private function openaiText(array $data): string
    {
        if (($data['status'] ?? null) !== 'completed' || ! is_array($data['output'] ?? null)) $this->invalidResponse();
        $text = '';
        foreach ($data['output'] as $item) {
            if (! is_array($item) || ($item['type'] ?? null) !== 'message' || ($item['role'] ?? null) !== 'assistant' || ! is_array($item['content'] ?? null)) continue;
            foreach ($item['content'] as $part) {
                if (! is_array($part)) continue;
                if (($part['type'] ?? null) === 'refusal') $this->refused();
                if (($part['type'] ?? null) === 'output_text' && is_string($part['text'] ?? null)) $text .= $part['text'];
            }
        }
        return $text;
    }

    private function geminiText(array $data): string
    {
        if (data_get($data, 'promptFeedback.blockReason')) $this->refused();
        $candidate = data_get($data, 'candidates.0');
        if (in_array(data_get($candidate, 'finishReason'), ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT'], true)) $this->refused();
        if (data_get($candidate, 'finishReason') !== 'STOP' || ! is_array(data_get($candidate, 'content.parts'))) $this->invalidResponse();
        $text = '';
        foreach ($candidate['content']['parts'] as $part) {
            if (is_array($part) && empty($part['thought']) && is_string($part['text'] ?? null)) $text .= $part['text'];
        }
        return $text;
    }

    private function anthropicText(array $data): string
    {
        if (($data['stop_reason'] ?? null) === 'refusal') $this->refused();
        if (($data['stop_reason'] ?? null) !== 'end_turn' || ($data['role'] ?? null) !== 'assistant' || ! is_array($data['content'] ?? null)) $this->invalidResponse();
        $text = '';
        foreach ($data['content'] as $part) {
            if (is_array($part) && ($part['type'] ?? null) === 'text' && is_string($part['text'] ?? null)) $text .= $part['text'];
        }
        return $text;
    }

    private function refused(): never
    {
        throw new EditorialSuggestionException('Could not create suggestions for this text. Try revising it.', 'ai_refused', 422);
    }

    private function invalidResponse(): never
    {
        throw new EditorialSuggestionException('The model returned an incomplete response. Please try again.', 'ai_invalid_response');
    }
}
