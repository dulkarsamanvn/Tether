<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_avatar' => ['sometimes', 'boolean'],
        ]);
        $newAvatar = null;
        $oldAvatar = null;

        try {
            $user = DB::transaction(function () use ($request, $validated, &$newAvatar, &$oldAvatar) {
                $user = User::lockForUpdate()->findOrFail($request->user()->id);
                $attributes = array_intersect_key($validated, array_flip(['name', 'bio']));
                if ($request->hasFile('avatar')) {
                    $oldAvatar = $user->avatar;
                    $attributes['avatar'] = $newAvatar = $request->file('avatar')->store('avatars', 'public');
                } elseif ($request->boolean('remove_avatar')) {
                    $oldAvatar = $user->avatar;
                    $attributes['avatar'] = null;
                }
                $user->update($attributes);

                return $user->fresh();
            });
        } catch (Throwable $error) {
            if ($newAvatar) Storage::disk('public')->delete($newAvatar);
            throw $error;
        }

        if ($oldAvatar) Storage::disk('public')->delete($oldAvatar);

        return response()->json(['message' => 'Profile updated.', 'user' => $user]);
    }
}
