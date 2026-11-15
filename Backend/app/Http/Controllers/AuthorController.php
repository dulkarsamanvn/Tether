<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;

class AuthorController extends Controller
{
    public function show($id): JsonResponse
    {
        $author = User::select(User::PROFILE_FIELDS)->where('is_active', true)
            ->withCount(['blogs as published_blogs_count' => fn ($query) => $query->where('status', 'published')])
            ->findOrFail($id);

        return response()->json($author);
    }

    public function blogs($id): JsonResponse
    {
        $author = User::where('is_active', true)->findOrFail($id);
        $blogs = $author->blogs()->where('status', 'published')
            ->with(['user', 'categories', 'tags'])->withCount('likedBy as likes_count')
            ->latest('published_at')->orderByDesc('id')->paginate(12);

        return response()->json($blogs);
    }
}
