<?php

namespace App\Http\Controllers;

use App\Exceptions\EditorialSuggestionException;
use App\Models\LlmConfiguration;
use App\Models\User;
use App\Services\EditorialSuggestions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LlmConfigurationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->assertActive($request);
        return response()->json($this->state($request->user()));
    }

    public function active(Request $request): JsonResponse
    {
        $this->assertActive($request);
        $agent = $request->user()->llmConfigurations()->where('is_active', true)->where('status', 'connected')->first();
        return response()->json(['configuration' => $agent?->publicData()]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertActive($request);
        DB::transaction(function () use ($request) {
            $this->lockUser($request->user());
            if ($request->user()->llmConfigurations()->count() >= 10) {
                throw ValidationException::withMessages(['name' => 'You can save up to 10 agents. Remove an unused agent first.']);
            }
            $request->user()->llmConfigurations()->create($this->validateInput($request));
        });
        return response()->json([...$this->state($request->user()), 'message' => 'Agent saved. Connect it to verify the model and use it for suggestions.'], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $this->assertActive($request);
        DB::transaction(function () use ($request, $id) {
            $this->lockUser($request->user());
            $agent = $request->user()->llmConfigurations()->lockForUpdate()->findOrFail($id);
            $input = $this->validateInput($request, $agent);
            $credentialsChanged = $input['provider'] !== $agent->provider || $input['model'] !== $agent->model || filled($input['api_key'] ?? null);
            if (empty($input['api_key'])) unset($input['api_key']);
            $agent->fill($input)->forceFill(['revision' => $agent->revision + 1]);
            if ($credentialsChanged) $agent->forceFill(['status' => 'untested', 'is_active' => false, 'tested_at' => null, 'last_error' => null]);
            $agent->save();
        });
        return response()->json([...$this->state($request->user()), 'message' => 'Agent updated. Reconnect if you changed the provider, model, or key.']);
    }

    public function connect(Request $request, $id, EditorialSuggestions $suggestions): JsonResponse
    {
        $this->assertActive($request);
        $agent = $request->user()->llmConfigurations()->findOrFail($id);
        $failure = null;
        try {
            $suggestions->generateFor($agent, 'A community garden', 'Neighbors planted a shared garden with tomatoes, herbs, and flowers. They water it together each weekend and share the harvest with their community.');
        } catch (EditorialSuggestionException $error) {
            $failure = $error;
        }
        DB::transaction(function () use ($request, $agent, $failure) {
            $this->lockUser($request->user());
            $current = $request->user()->llmConfigurations()->lockForUpdate()->findOrFail($agent->id);
            abort_if($current->revision !== $agent->revision, 409, 'This agent changed while connecting. Please connect it again.');
            if (! $failure) $request->user()->llmConfigurations()->where('is_active', true)->update(['is_active' => false]);
            $current->forceFill(['status' => $failure ? 'error' : 'connected', 'is_active' => ! $failure, 'tested_at' => now(), 'last_error' => $failure?->getMessage()])->save();
        });
        return response()->json([
            ...$this->state($request->user()),
            'message' => $failure?->getMessage() ?? 'Agent connected. The editor will use this model for suggestions.',
            ...($failure ? ['code' => $failure->errorCode] : []),
        ], $failure?->status ?? 200);
    }

    public function disconnect(Request $request, $id): JsonResponse
    {
        $this->assertActive($request);
        DB::transaction(function () use ($request, $id) {
            $this->lockUser($request->user());
            $agent = $request->user()->llmConfigurations()->lockForUpdate()->findOrFail($id);
            $agent->forceFill(['is_active' => false, 'revision' => $agent->revision + 1])->save();
        });
        return response()->json([...$this->state($request->user()), 'message' => 'Agent disconnected. Its saved settings are kept.']);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $this->assertActive($request);
        DB::transaction(function () use ($request, $id) {
            $this->lockUser($request->user());
            $request->user()->llmConfigurations()->findOrFail($id)->delete();
        });
        return response()->json([...$this->state($request->user()), 'message' => 'Agent deleted.']);
    }

    private function validateInput(Request $request, ?LlmConfiguration $agent = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('llm_configurations')->where('user_id', $request->user()->id)->ignore($agent?->id)],
            'provider' => ['required', Rule::in(array_keys(LlmConfiguration::PROVIDERS))],
            'model' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/'],
            'api_key' => [Rule::requiredIf(! $agent || $request->input('provider') !== $agent->provider), 'nullable', 'string', 'min:10', 'max:4096', 'regex:/^[\x21-\x7E]+$/'],
            'instructions' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function state(User $user): array
    {
        $agents = $user->llmConfigurations()->orderByDesc('id')->get();
        return [
            'providers' => collect(LlmConfiguration::PROVIDERS)->map(fn ($value, $key) => ['id' => $key, ...$value])->values(),
            'configurations' => $agents->map->publicData()->values(),
            'active_configuration_id' => $agents->firstWhere('is_active', true)?->id,
        ];
    }

    private function assertActive(Request $request): void
    {
        abort_unless($request->user()->is_active, 403);
    }

    private function lockUser(User $user): void
    {
        User::whereKey($user->id)->lockForUpdate()->firstOrFail();
    }
}
