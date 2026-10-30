<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Models\Bookmark;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookmarkController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $blogs = $request->user()->savedBlogs()
            ->where('status', 'published')
            ->with(['user:id,name', 'categories', 'tags'])
            ->withCount('likedBy as likes_count')
            ->orderByPivot('created_at', 'desc')
            ->orderByPivot('id', 'desc')
            ->paginate(10);

        return response()->json($blogs);
    }

    public function store(Request $request, $id): JsonResponse
    {
        $blog = Blog::where('status', 'published')->findOrFail($id);

        Bookmark::firstOrCreate([
            'user_id' => $request->user()->id,
            'blog_id' => $blog->id,
        ]);

        return response()->json(['is_bookmarked' => true]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        // Allow removing a saved post even if it was unpublished or deleted.
        $request->user()->savedBlogs()->detach($id);

        return response()->json(['is_bookmarked' => false]);
    }
}
