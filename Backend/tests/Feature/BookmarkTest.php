<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookmarkTest extends TestCase
{
    use RefreshDatabase;

    public function test_bookmark_endpoints_require_authentication(): void
    {
        $this->getJson('/api/bookmarks')->assertUnauthorized();
        $this->putJson('/api/blogs/1/bookmark')->assertUnauthorized();
        $this->deleteJson('/api/blogs/1/bookmark')->assertUnauthorized();
    }

    public function test_saving_is_idempotent_and_persists_in_the_reading_list(): void
    {
        $reader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        Sanctum::actingAs($reader);

        $this->putJson("/api/blogs/{$blog->id}/bookmark")
            ->assertOk()->assertJsonPath('is_bookmarked', true);
        $this->putJson("/api/blogs/{$blog->id}/bookmark")
            ->assertOk()->assertJsonPath('is_bookmarked', true);

        $this->assertDatabaseCount('bookmarks', 1);
        $this->assertDatabaseHas('bookmarks', ['user_id' => $reader->id, 'blog_id' => $blog->id]);
        $this->getJson('/api/bookmarks')->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $blog->id)
            ->assertJsonPath('data.0.user.name', $blog->user->name)
            ->assertJsonStructure(['data' => [['categories', 'tags']]]);
    }

    public function test_removing_a_bookmark_does_not_remove_another_readers_bookmark(): void
    {
        $reader = User::factory()->create();
        $otherReader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $reader->savedBlogs()->attach($blog->id);
        $otherReader->savedBlogs()->attach($blog->id);
        Sanctum::actingAs($reader);

        $this->deleteJson("/api/blogs/{$blog->id}/bookmark")
            ->assertOk()->assertJsonPath('is_bookmarked', false);
        $this->deleteJson("/api/blogs/{$blog->id}/bookmark")->assertOk();

        $this->getJson('/api/bookmarks')->assertOk()->assertJsonPath('total', 0);
        $this->assertDatabaseHas('bookmarks', ['user_id' => $otherReader->id, 'blog_id' => $blog->id]);
        $this->assertDatabaseMissing('bookmarks', ['user_id' => $reader->id, 'blog_id' => $blog->id]);
        $this->assertModelExists($blog);
    }

    public function test_the_reading_list_only_contains_the_current_readers_published_visible_posts(): void
    {
        $reader = User::factory()->create();
        $author = User::factory()->create();
        $visible = $this->createBlog($author);
        $draft = $this->createBlog($author, ['status' => 'draft']);
        $deleted = $this->createBlog($author);
        $otherReadersBlog = $this->createBlog($author);
        $reader->savedBlogs()->attach([$visible->id, $draft->id, $deleted->id]);
        $author->savedBlogs()->attach($otherReadersBlog->id);
        $deleted->delete();
        Sanctum::actingAs($reader);

        $this->getJson('/api/bookmarks')->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $visible->id);
    }

    public function test_bookmarks_are_paginated_with_the_most_recent_saves_first(): void
    {
        $reader = User::factory()->create();
        $author = User::factory()->create();
        $ids = [];
        for ($index = 0; $index < 12; $index++) {
            $blog = $this->createBlog($author);
            $ids[] = $blog->id;
            $reader->savedBlogs()->attach($blog->id, [
                'created_at' => now()->subMinutes(12 - $index),
            ]);
        }
        Sanctum::actingAs($reader);

        $this->getJson('/api/bookmarks')->assertOk()
            ->assertJsonPath('total', 12)
            ->assertJsonPath('last_page', 2)
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('data.0.id', $ids[11]);
        $this->getJson('/api/bookmarks?page=2')->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $ids[1]);
    }

    public function test_drafts_deleted_and_missing_posts_cannot_be_saved(): void
    {
        $reader = User::factory()->create();
        $draft = $this->createBlog($reader, ['status' => 'draft']);
        $deleted = $this->createBlog($reader);
        $deleted->delete();
        Sanctum::actingAs($reader);

        foreach ([$draft->id, $deleted->id, 999999] as $id) {
            $this->putJson("/api/blogs/{$id}/bookmark")->assertNotFound();
        }
        $this->assertDatabaseCount('bookmarks', 0);
    }

    public function test_a_saved_post_can_be_removed_after_it_is_unpublished_or_deleted(): void
    {
        $reader = User::factory()->create();
        $draft = $this->createBlog($reader);
        $deleted = $this->createBlog($reader);
        $reader->savedBlogs()->attach([$draft->id, $deleted->id]);
        $draft->update(['status' => 'draft']);
        $deleted->delete();
        Sanctum::actingAs($reader);

        $this->deleteJson("/api/blogs/{$draft->id}/bookmark")->assertOk();
        $this->deleteJson("/api/blogs/{$deleted->id}/bookmark")->assertOk();
        $this->assertDatabaseCount('bookmarks', 0);
    }

    public function test_the_blog_view_returns_the_signed_in_readers_saved_state(): void
    {
        $reader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $reader->savedBlogs()->attach($blog->id);

        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_bookmarked', false);

        $token = $reader->createToken('bookmark-test')->plainTextToken;
        $this->withToken($token)->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_bookmarked', true);

        $this->deleteJson("/api/blogs/{$blog->id}/bookmark")->assertOk();
        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_bookmarked', false);
    }

    public function test_a_readers_saved_state_does_not_leak_to_another_reader(): void
    {
        $reader = User::factory()->create();
        $otherReader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $reader->savedBlogs()->attach($blog->id);
        Sanctum::actingAs($otherReader);

        $this->getJson('/api/bookmarks')->assertOk()->assertJsonPath('total', 0);
        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_bookmarked', false);
    }

    private function createBlog(User $author, array $attributes = []): Blog
    {
        return $author->blogs()->create(array_merge([
            'title' => 'A published article',
            'slug' => (string) Str::uuid(),
            'content' => '<p>Article content</p>',
            'status' => 'published',
            'published_at' => now(),
        ], $attributes));
    }
}
