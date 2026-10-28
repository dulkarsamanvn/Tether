<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Models\Comment;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    //show comments of one published blog
    public function index($blogId)
    {
        $blog = Blog::where('status', 'published')->findOrFail($blogId);

        $comments = $blog->comments()
            ->with('user:id,name')
            ->latest()
            ->paginate(20);

        return response()->json($comments);
    }

    //add a comment
    public function store(Request $request, $blogId)
    {
        $blog = Blog::where('status', 'published')->findOrFail($blogId);

        if (! $blog->allow_comments) {
            return response()->json([
                'message' => 'Comments are turned off for this blog.',
            ], 403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:1000'],
        ]);

        $comment = $blog->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        $comment->load('user:id,name');

        return response()->json([
            'message' => 'Comment added successfully.',
            'comment' => $comment,
        ], 201);
    }

    //delete a comment
    public function destroy(Request $request, $id)
    {
        $comment = Comment::with('blog')->findOrFail($id);

        $isCommentOwner = $comment->user_id === $request->user()->id;
        $isBlogOwner = $comment->blog->user_id === $request->user()->id;

        if (! $isCommentOwner && ! $isBlogOwner) {
            return response()->json([
                'message' => 'You are not allowed to delete this comment.',
            ], 403);
        }

        $comment->delete();

        return response()->json([
            'message' => 'Comment deleted successfully.',
        ]);
    }
}
