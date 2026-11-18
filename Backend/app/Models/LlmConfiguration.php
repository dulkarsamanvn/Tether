<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LlmConfiguration extends Model
{
    public const PROVIDERS = [
        'openai' => ['label' => 'OpenAI', 'default_model' => 'gpt-5.4-mini'],
        'gemini' => ['label' => 'Google Gemini', 'default_model' => 'gemini-3.5-flash-lite'],
        'anthropic' => ['label' => 'Anthropic Claude', 'default_model' => 'claude-haiku-5-5'],
        'grok' => ['label' => 'Grok (xAI)', 'default_model' => 'grok-4.7'],
    ];

    protected $fillable = ['name', 'provider', 'model', 'api_key', 'instructions'];
    protected $hidden = ['api_key'];

    protected function casts(): array
    {
        return ['api_key' => 'encrypted', 'is_active' => 'boolean', 'revision' => 'integer', 'tested_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function publicData(): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'provider' => $this->provider,
            'provider_name' => self::PROVIDERS[$this->provider]['label'], 'model' => $this->model,
            'instructions' => $this->instructions ?? '', 'status' => $this->status,
            'is_active' => $this->is_active, 'revision' => $this->revision,
            'has_api_key' => filled($this->getRawOriginal('api_key')),
            'tested_at' => $this->tested_at?->toIso8601String(), 'last_error' => $this->last_error,
        ];
    }
}
