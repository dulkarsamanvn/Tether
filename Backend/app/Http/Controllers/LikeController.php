<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Models\BlogLike;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LikeController extends Controller
{
    public function store(Request $request, $id): JsonResponse
    {
        $blog = Blog::where('status', 'published')->findOrFail($id);

        BlogLike::firstOrCreate([
            'user_id' => $request->user()->id,
            'blog_id' => $blog->id,
        ]);

        return response()->json([
            'is_liked' => true,
            'likes_count' => $blog->likedBy()->count(),
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $blog = Blog::where('status', 'published')->findOrFail($id);
        $request->user()->likedBlogs()->detach($blog->id);

        return response()->json([
            'is_liked' => false,
            'likes_count' => $blog->likedBy()->count(),
        ]);
    }
}
