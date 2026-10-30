<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LikeTest extends TestCase
{
    use RefreshDatabase;

    public function test_liking_and_unliking_require_authentication(): void
    {
        $this->putJson('/api/blogs/1/like')->assertUnauthorized();
        $this->deleteJson('/api/blogs/1/like')->assertUnauthorized();
    }

    public function test_repeated_likes_create_one_record_for_the_authenticated_reader(): void
    {
        $reader = User::factory()->create();
        $author = User::factory()->create();
        $blog = $this->createBlog($author);
        Sanctum::actingAs($reader);

        $this->putJson("/api/blogs/{$blog->id}/like", ['user_id' => $author->id])
            ->assertOk()->assertExactJson(['is_liked' => true, 'likes_count' => 1]);
        $this->putJson("/api/blogs/{$blog->id}/like")
            ->assertOk()->assertExactJson(['is_liked' => true, 'likes_count' => 1]);

        $this->assertDatabaseCount('blog_likes', 1);
        $this->assertDatabaseHas('blog_likes', ['user_id' => $reader->id, 'blog_id' => $blog->id]);
    }

    public function test_repeated_unlikes_keep_the_total_at_zero(): void
    {
        $reader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $reader->likedBlogs()->attach($blog->id);
        Sanctum::actingAs($reader);

        $this->deleteJson("/api/blogs/{$blog->id}/like")
            ->assertOk()->assertExactJson(['is_liked' => false, 'likes_count' => 0]);
        $this->deleteJson("/api/blogs/{$blog->id}/like")
            ->assertOk()->assertExactJson(['is_liked' => false, 'likes_count' => 0]);

        $this->assertDatabaseCount('blog_likes', 0);
        $this->assertModelExists($blog);
    }

    public function test_unliking_only_removes_the_current_readers_like(): void
    {
        $reader = User::factory()->create();
        $otherReader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $reader->likedBlogs()->attach($blog->id);
        $otherReader->likedBlogs()->attach($blog->id);
        Sanctum::actingAs($reader);

        $this->deleteJson("/api/blogs/{$blog->id}/like", ['user_id' => $otherReader->id])
            ->assertOk()->assertExactJson(['is_liked' => false, 'likes_count' => 1]);

        $this->assertDatabaseMissing('blog_likes', ['user_id' => $reader->id, 'blog_id' => $blog->id]);
        $this->assertDatabaseHas('blog_likes', ['user_id' => $otherReader->id, 'blog_id' => $blog->id]);
    }

    public function test_guests_can_read_like_totals_without_receiving_a_readers_liked_state(): void
    {
        $reader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $reader->likedBlogs()->attach($blog->id);

        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('likes_count', 1)
            ->assertJsonPath('is_liked', false);
    }

    public function test_the_blog_view_restores_liked_state_with_a_bearer_token(): void
    {
        $reader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $token = $reader->createToken('like-test')->plainTextToken;

        $this->withToken($token)->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_liked', false)
            ->assertJsonPath('likes_count', 0);
        $this->putJson("/api/blogs/{$blog->id}/like")->assertOk();
        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_liked', true)
            ->assertJsonPath('likes_count', 1);

        $this->deleteJson("/api/blogs/{$blog->id}/like")->assertOk();
        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_liked', false)
            ->assertJsonPath('likes_count', 0);
    }

    public function test_liked_state_is_specific_to_the_current_reader(): void
    {
        $reader = User::factory()->create();
        $otherReader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $reader->likedBlogs()->attach($blog->id);
        Sanctum::actingAs($otherReader);

        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('is_liked', false)
            ->assertJsonPath('likes_count', 1);
    }

    public function test_published_and_saved_blog_lists_include_accurate_like_totals(): void
    {
        $reader = User::factory()->create();
        $author = User::factory()->create();
        $liked = $this->createBlog($author, ['published_at' => now()->subDay()]);
        $unliked = $this->createBlog($author);
        $reader->likedBlogs()->attach($liked->id);
        $author->likedBlogs()->attach($liked->id);
        $reader->savedBlogs()->attach($liked->id);
        Sanctum::actingAs($reader);

        $this->getJson('/api/blogs')->assertOk()
            ->assertJsonPath('data.0.id', $unliked->id)
            ->assertJsonPath('data.0.likes_count', 0)
            ->assertJsonPath('data.1.id', $liked->id)
            ->assertJsonPath('data.1.likes_count', 2);
        $this->getJson('/api/bookmarks')->assertOk()
            ->assertJsonPath('data.0.id', $liked->id)
            ->assertJsonPath('data.0.likes_count', 2);
    }

    public function test_draft_deleted_and_missing_posts_cannot_be_liked_or_unliked(): void
    {
        $reader = User::factory()->create();
        $draft = $this->createBlog($reader, ['status' => 'draft']);
        $deleted = $this->createBlog($reader);
        $deleted->delete();
        Sanctum::actingAs($reader);

        foreach ([$draft->id, $deleted->id, 999999] as $id) {
            $this->putJson("/api/blogs/{$id}/like")->assertNotFound();
            $this->deleteJson("/api/blogs/{$id}/like")->assertNotFound();
        }
        $this->assertDatabaseCount('blog_likes', 0);
    }

    public function test_deleting_a_reader_removes_their_likes_from_public_totals(): void
    {
        $reader = User::factory()->create();
        $blog = $this->createBlog(User::factory()->create());
        $reader->likedBlogs()->attach($blog->id);
        $reader->delete();

        $this->assertDatabaseCount('blog_likes', 0);
        $this->getJson("/api/blogs/{$blog->id}")->assertOk()
            ->assertJsonPath('likes_count', 0);
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
