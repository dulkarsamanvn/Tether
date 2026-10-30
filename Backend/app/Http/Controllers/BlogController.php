<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Models\BlogView;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class BlogController extends Controller
{
    //show all published blogs
    public function index(Request $request)
    {
        $query = Blog::with(['user', 'categories', 'tags'])
            ->where('status','published');

        // Filter by category slug
        if ($request->has('category')) {
            $query->whereHas('categories', function ($q) use ($request) {
                $q->where('slug', $request->category);
            });
        }

        // Filter by tag slug
        if ($request->has('tag')) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('slug', $request->tag);
            });
        }

        $blogs = $query->latest('published_at')->paginate(10);

        return response()->json($blogs);
    }

    //view one published blog 
    public function show(Request $request, $id)
    {
        $blog = Blog::with(['user', 'categories', 'tags'])->where('status', 'published')->findOrFail($id);

        // Try to resolve logged-in user (optional auth)
        $user = auth('sanctum')->user();

        $blog->setAttribute('is_bookmarked', $user
            ? $blog->bookmarkedBy()->where('users.id', $user->id)->exists()
            : false);

        // Don't count views from the blog author
        $isAuthor = $user && $user->id === $blog->user_id;

        if (! $isAuthor) {
            if ($user) {
                // Logged-in user: track by user_id (one view per user per blog)
                $alreadyViewed = BlogView::where('blog_id', $blog->id)
                    ->where('user_id', $user->id)
                    ->exists();

                if (! $alreadyViewed) {
                    BlogView::create([
                        'blog_id'    => $blog->id,
                        'user_id'    => $user->id,
                        'ip_address' => $request->ip(),
                    ]);
                    $blog->increment('view_count');
                }
            } else {
                // Guest: track by IP address
                $alreadyViewed = BlogView::where('blog_id', $blog->id)
                    ->whereNull('user_id')
                    ->where('ip_address', $request->ip())
                    ->exists();

                if (! $alreadyViewed) {
                    BlogView::create([
                        'blog_id'    => $blog->id,
                        'user_id'    => null,
                        'ip_address' => $request->ip(),
                    ]);
                    $blog->increment('view_count');
                }
            }
        }

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
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
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

        // Sync categories and tags
        $blog->categories()->sync($request->category_ids ?? []);
        $blog->tags()->sync($request->tag_ids ?? []);
        $blog->load(['categories', 'tags']);

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
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
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

        // Sync categories and tags
        if ($request->has('category_ids')) {
            $blog->categories()->sync($request->category_ids ?? []);
        }
        if ($request->has('tag_ids')) {
            $blog->tags()->sync($request->tag_ids ?? []);
        }
        $blog->load(['categories', 'tags']);

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
        $query = $request->user()->blogs()->with(['categories', 'tags'])->latest();

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
        $blog = $request->user()->blogs()->with(['categories', 'tags'])->findOrFail($id);

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
