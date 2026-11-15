<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\Category;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BlogTrashTest extends TestCase
{
    use RefreshDatabase;

    public function test_trash_actions_require_authentication(): void
    {
        $this->getJson('/api/my-blogs/trash')->assertUnauthorized();
        $this->deleteJson('/api/blogs/1')->assertUnauthorized();
        $this->putJson('/api/blogs/1/restore')->assertUnauthorized();
    }

    public function test_moving_a_post_to_trash_hides_it_from_readers_and_the_editor(): void
    {
        $author = User::factory()->create();
        $blog = $this->createBlog($author);
        Sanctum::actingAs($author);

        $this->deleteJson("/api/blogs/{$blog->id}")
            ->assertOk()->assertJsonPath('message', 'Blog moved to Trash.');

        $this->assertSoftDeleted($blog);
        $this->assertDatabaseCount('blogs', 1);
        $this->getJson('/api/blogs')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/my-blogs')->assertOk()->assertJsonPath('total', 0);
        $this->getJson("/api/blogs/{$blog->id}")->assertNotFound();
        $this->getJson("/api/blogs/{$blog->id}/comments")->assertNotFound();
        $this->getJson("/api/my-blogs/{$blog->id}")->assertNotFound();
        $this->putJson("/api/blogs/{$blog->id}", ['title' => 'Changed in Trash'])->assertNotFound();
        $this->deleteJson("/api/blogs/{$blog->id}")->assertNotFound();
        $this->getJson('/api/my-blogs/trash')->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $blog->id);
        $this->assertSame($blog->title, Blog::onlyTrashed()->findOrFail($blog->id)->title);
    }

    public function test_an_author_cannot_trash_or_restore_another_authors_post(): void
    {
        $owner = User::factory()->create();
        $otherAuthor = User::factory()->create();
        $blog = $this->createBlog($owner);
        Sanctum::actingAs($otherAuthor);

        $this->deleteJson("/api/blogs/{$blog->id}", ['user_id' => $owner->id])->assertNotFound();
        $this->assertNotSoftDeleted($blog);

        $blog->delete();

        $this->putJson("/api/blogs/{$blog->id}/restore", ['user_id' => $owner->id])->assertNotFound();
        $this->getJson('/api/my-blogs/trash')->assertOk()->assertJsonPath('total', 0);
        $this->assertSoftDeleted($blog);
    }

    public function test_trash_is_private_paginated_and_sorted_by_deletion_date(): void
    {
        $author = User::factory()->create();
        $otherAuthor = User::factory()->create();
        $this->createBlog($author);
        $otherDeleted = $this->createBlog($otherAuthor);
        $otherDeleted->delete();
        $deletedIds = [];

        for ($i = 0; $i < 12; $i++) {
            $blog = $this->createBlog($author, ['status' => $i % 2 === 0 ? 'draft' : 'published']);
            // The first created post is deleted last, so creation order cannot determine sorting.
            $blog->forceFill(['deleted_at' => now()->subMinutes($i)])->save();
            $deletedIds[] = $blog->id;
        }

        Sanctum::actingAs($author);

        $firstPage = $this->getJson('/api/my-blogs/trash')->assertOk()
            ->assertJsonPath('total', 12)
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('last_page', 2)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure(['data' => [['deleted_at', 'categories', 'tags']]]);
        $this->assertSame(array_slice($deletedIds, 0, 10), array_column($firstPage->json('data'), 'id'));

        $secondPage = $this->getJson('/api/my-blogs/trash?page=2')->assertOk()
            ->assertJsonPath('current_page', 2)
            ->assertJsonCount(2, 'data');
        $this->assertSame(array_slice($deletedIds, 10), array_column($secondPage->json('data'), 'id'));
    }

    public function test_restoring_a_published_post_preserves_its_content_and_relationships(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('blogs/cover.jpg', 'original cover');
        $author = User::factory()->create();
        $reader = User::factory()->create();
        $blog = $this->createBlog($author, [
            'featured_image' => 'blogs/cover.jpg',
            'excerpt' => 'Original excerpt',
            'meta_title' => 'Original meta title',
            'meta_description' => 'Original meta description',
            'is_featured' => true,
            'allow_comments' => true,
        ]);
        $category = Category::create(['name' => 'Technology', 'slug' => 'technology']);
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $blog->categories()->attach($category->id);
        $blog->tags()->attach($tag->id);
        $comment = $blog->comments()->create(['user_id' => $reader->id, 'body' => 'Keep this comment.']);
        $view = $blog->blogViews()->create(['user_id' => $reader->id, 'ip_address' => '127.0.0.1']);
        $blog->forceFill(['view_count' => 1])->save();
        $reader->likedBlogs()->attach($blog->id);
        $reader->savedBlogs()->attach($blog->id);
        $original = $blog->fresh()->getRawOriginal();
        Sanctum::actingAs($author);

        $this->deleteJson("/api/blogs/{$blog->id}")->assertOk();
        Storage::disk('public')->assertExists('blogs/cover.jpg');

        Sanctum::actingAs($reader);
        $this->getJson('/api/bookmarks')->assertOk()->assertJsonPath('total', 0);
        $this->putJson("/api/blogs/{$blog->id}/like")->assertNotFound();
        $this->putJson("/api/blogs/{$blog->id}/bookmark")->assertNotFound();
        $this->postJson("/api/blogs/{$blog->id}/comments", ['body' => 'Hidden'])->assertNotFound();

        Sanctum::actingAs($author);
        $this->putJson("/api/blogs/{$blog->id}/restore", ['status' => 'draft', 'title' => 'Overwrite'])
            ->assertOk()
            ->assertJsonPath('blog.id', $blog->id)
            ->assertJsonPath('blog.deleted_at', null)
            ->assertJsonPath('blog.status', 'published')
            ->assertJsonPath('blog.categories.0.id', $category->id)
            ->assertJsonPath('blog.tags.0.id', $tag->id);

        $restored = $blog->fresh();
        foreach ($original as $attribute => $value) {
            if (! in_array($attribute, ['updated_at', 'deleted_at'])) {
                $this->assertSame($value, $restored->getRawOriginal($attribute), $attribute);
            }
        }
        $this->assertNotSoftDeleted($restored);
        Storage::disk('public')->assertExists('blogs/cover.jpg');
        $this->assertSame('original cover', Storage::disk('public')->get('blogs/cover.jpg'));
        $this->assertModelExists($comment);
        $this->assertModelExists($view);
        $this->assertDatabaseHas('blog_likes', ['blog_id' => $blog->id, 'user_id' => $reader->id]);
        $this->assertDatabaseHas('bookmarks', ['blog_id' => $blog->id, 'user_id' => $reader->id]);
        $this->getJson('/api/my-blogs/trash')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/my-blogs')->assertOk()->assertJsonPath('data.0.id', $blog->id);

        Sanctum::actingAs($reader);
        $this->getJson('/api/blogs')->assertOk()->assertJsonPath('data.0.id', $blog->id);
        $this->getJson('/api/bookmarks')->assertOk()->assertJsonPath('data.0.id', $blog->id);
        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_liked', true)
            ->assertJsonPath('is_bookmarked', true)
            ->assertJsonPath('view_count', 1);
        $this->getJson("/api/blogs/{$blog->id}/comments")->assertOk()->assertJsonPath('data.0.id', $comment->id);
    }

    public function test_restoring_a_draft_keeps_it_private_and_editable(): void
    {
        $author = User::factory()->create();
        $blog = $this->createBlog($author, ['status' => 'draft', 'published_at' => null]);
        $blog->delete();
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$blog->id}/restore")->assertOk()
            ->assertJsonPath('blog.status', 'draft')
            ->assertJsonPath('blog.published_at', null);
        $this->getJson('/api/my-blogs?status=draft')->assertOk()->assertJsonPath('data.0.id', $blog->id);
        $this->getJson("/api/my-blogs/{$blog->id}")->assertOk();
        $this->putJson("/api/blogs/{$blog->id}", ['title' => 'Recovered draft'])->assertOk();
        $this->getJson('/api/blogs')->assertOk()->assertJsonPath('total', 0);
        $this->getJson("/api/blogs/{$blog->id}")->assertNotFound();
    }

    public function test_active_missing_and_already_restored_posts_cannot_be_restored(): void
    {
        $author = User::factory()->create();
        $active = $this->createBlog($author);
        $deleted = $this->createBlog($author);
        $deleted->delete();
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$active->id}/restore")->assertNotFound();
        $this->putJson('/api/blogs/999999/restore')->assertNotFound();
        $this->putJson("/api/blogs/{$deleted->id}/restore")->assertOk();
        $this->putJson("/api/blogs/{$deleted->id}/restore")->assertNotFound();
        $this->assertDatabaseCount('blogs', 2);
        $this->assertNotSoftDeleted($active);
        $this->assertNotSoftDeleted($deleted);
    }

    private function createBlog(User $author, array $attributes = []): Blog
    {
        return $author->blogs()->create(array_merge([
            'title' => 'A recoverable article',
            'slug' => (string) Str::uuid(),
            'content' => '<p>Original article content.</p>',
            'status' => 'published',
            'published_at' => now()->subDays(2),
        ], $attributes));
    }
}
