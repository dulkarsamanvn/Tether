<?php

namespace App\Http\Controllers;

use App\Exceptions\EditorialSuggestionException;
use App\Services\EditorialSuggestions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EditorialSuggestionController extends Controller
{
    public function store(Request $request, EditorialSuggestions $suggestions): JsonResponse
    {
        abort_unless($request->user()->is_active, 403);
        $input = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:20000'],
            'configuration_id' => ['nullable', 'required_with:configuration_revision', 'integer', 'min:1'],
            'configuration_revision' => ['nullable', 'required_with:configuration_id', 'integer', 'min:1'],
        ]);
        $content = trim(preg_replace('/\s+/u', ' ', $input['content']));
        if (mb_strlen($content) < 80) {
            throw ValidationException::withMessages(['content' => 'Write at least 80 characters of draft text before requesting suggestions.']);
        }

        try {
            return response()->json($suggestions->generate($request->user(), $input['title'] ?? '', $content, $input['configuration_id'] ?? null, $input['configuration_revision'] ?? null));
        } catch (EditorialSuggestionException $error) {
            // Never return upstream errors, credentials, or draft text to the client.
            return response()->json(['message' => $error->getMessage(), 'code' => $error->errorCode], $error->status);
        }
    }
}
