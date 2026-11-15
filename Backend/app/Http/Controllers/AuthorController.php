<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;

class AuthorController extends Controller
{
    public function show($id): JsonResponse
    {
        $author = User::select(User::PROFILE_FIELDS)->where('is_active', true)
            ->withProfileCounts()
            ->findOrFail($id);
        $viewer = auth('sanctum')->user();
        $author->setAttribute('is_following', $viewer ? $viewer->following()->where('users.id', $author->id)->exists() : false);

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

    public function followers($id): JsonResponse
    {
        return $this->connections($id, 'followers');
    }

    public function following($id): JsonResponse
    {
        return $this->connections($id, 'following');
    }

    private function connections($id, string $relation): JsonResponse
    {
        $author = User::where('is_active', true)->findOrFail($id);
        $viewerId = auth('sanctum')->user()?->id ?? 0;
        $columns = array_map(fn ($field) => 'users.'.$field, User::PROFILE_FIELDS);
        $people = $author->{$relation}()->select($columns)
            ->where('users.is_active', true)->withProfileCounts()
            ->withExists(['followers as is_following' => fn ($followers) => $followers->where('author_follows.follower_id', $viewerId)])
            ->orderByPivot('created_at', 'desc')->orderByDesc('users.id')
            ->paginate(12, $columns);
        $people->getCollection()->each(fn ($person) => $person->unsetRelation('pivot'));

        return response()->json($people);
    }
}
