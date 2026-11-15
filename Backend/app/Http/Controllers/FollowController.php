<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FollowController extends Controller
{
    public function store(Request $request, $id): JsonResponse
    {
        $author = User::where('is_active', true)->findOrFail($id);
        if ($author->id === $request->user()->id) {
            throw ValidationException::withMessages(['author' => 'You cannot follow yourself.']);
        }

        // The composite primary key makes repeated and concurrent follows safe.
        DB::table('author_follows')->insertOrIgnore([
            'follower_id' => $request->user()->id,
            'author_id' => $author->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'is_following' => true,
            'followers_count' => $author->followers()->where('is_active', true)->count(),
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        // Unfollowing remains available if an author has become inactive.
        $author = User::findOrFail($id);
        $request->user()->following()->detach($author->id);

        return response()->json([
            'is_following' => false,
            'followers_count' => $author->followers()->where('is_active', true)->count(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $columns = array_map(fn ($field) => 'users.'.$field, User::PROFILE_FIELDS);
        $authors = $request->user()->following()
            ->select($columns)
            ->where('users.is_active', true)->withProfileCounts()
            ->orderByPivot('created_at', 'desc')->orderByDesc('users.id')->paginate(12, $columns);
        // Pivot metadata is private to the implementation, not the author card.
        $authors->getCollection()->each(fn ($author) => $author->unsetRelation('pivot'));

        return response()->json($authors);
    }

    public function feed(Request $request): JsonResponse
    {
        $blogs = Blog::where('status', 'published')
            ->whereIn('user_id', DB::table('author_follows')->select('author_id')->where('follower_id', $request->user()->id))
            ->whereHas('user', fn ($author) => $author->where('is_active', true))
            ->with(['user', 'categories', 'tags'])->withCount('likedBy as likes_count')
            ->latest('published_at')->orderByDesc('id')->paginate(12);

        return response()->json($blogs);
    }
}
