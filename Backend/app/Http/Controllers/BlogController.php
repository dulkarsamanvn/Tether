<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    //show all published blogs
    public function index()
    {
        $blogs = Blog::where('status','published')
            ->latest('published_at')
            ->paginate(10);

        return response()->json($blogs);
    }

    //view one published blog 
    public function show($id)
    {
        $blog = Blog::where('status', 'published')->findOrFail($id);

        $blog->increment('view_count');

        return response()->json($blog);
    }

    // create new blog
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string'],
            'content' => ['required', 'string'],
            'featured_image' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:draft,published'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'is_featured' => ['boolean'],
            'allow_comments' => ['boolean'],
        ]);

        $validated['slug'] = $this->makeSlug($validated['title']);

        if ($validated['status'] === 'published') {
            $validated['published_at'] = now();
        }

        $blog = $request->user()->blogs()->create($validated);

        return response()->json([
            'message' => 'Blog created successfully.',
            'blog' => $blog,
        ], 201);

    }

    //update the blog
    public function update(Request $request,$id)
    {
        $blog = $request->user()->blogs()->findOrFail($id);
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string'],
            'content' => ['sometimes', 'required', 'string'],
            'featured_image' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'in:draft,published'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'is_featured' => ['boolean'],
            'allow_comments' => ['boolean'],
        ]);

        if (($validated['status'] ?? null) === 'published' && ! $blog->published_at) {
            $validated['published_at'] = now();
        }
        $blog->update($validated);

        return response()->json([
            'message' => 'Blog updated successfully.',
            'blog' => $blog,
        ]);

    }

    //delete the blog
    public function destroy(Request $request,$id)
    {
        $blog = $request->user()->blogs()->findOrFail($id);
        $blog->delete();

        return response()->json([
            'message' => 'Blog deleted successfully.',
        ]);
    }

    //helper functions
    private function makeSlug($title)
    {
        $slug = Str::slug($title);
        $original = $slug;
        $count = 1;

        while (Blog::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $original . '-' . $count;
            $count++;
        }

        return $slug;
    }
}
