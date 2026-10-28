<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

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
            'featured_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'status' => ['required', 'in:draft,published'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'is_featured' => ['boolean'],
            'allow_comments' => ['boolean'],
        ]);

        $validated['slug'] = $this->makeSlug($validated['title']);

        // if a picture was uploaded, save it and keep its location
        if ($request->hasFile('featured_image')) {
            $validated['featured_image'] = $request->file('featured_image')->store('blogs', 'public');
        }

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
            'featured_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'status' => ['sometimes', 'required', 'in:draft,published'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'is_featured' => ['boolean'],
            'allow_comments' => ['boolean'],
        ]);

        // if a new picture was uploaded, remove the old one and save the new one
        if ($request->hasFile('featured_image')) {
            if ($blog->featured_image) {
                Storage::disk('public')->delete($blog->featured_image);
            }
            $validated['featured_image'] = $request->file('featured_image')->store('blogs', 'public');
        }

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

    // show all blogs of logged in user (all statuses: draft + published)
    public function myBlogs(Request $request)
    {
        $query = $request->user()->blogs()->latest();

        // optional ?status=draft|published filter
        if ($request->has('status') && in_array($request->status, ['draft', 'published'])) {
            $query->where('status', $request->status);
        }

        $blogs = $query->paginate(10);

        return response()->json($blogs);
    }

    // show a single blog owned by the logged-in user (any status, no view_count increment)
    public function myBlog(Request $request, $id)
    {
        $blog = $request->user()->blogs()->findOrFail($id);

        return response()->json($blog);
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
