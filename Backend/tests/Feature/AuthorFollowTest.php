<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorFollowTest extends TestCase
{
    use RefreshDatabase;

    public function test_follow_and_following_endpoints_require_authentication(): void
    {
        $this->putJson('/api/authors/1/follow')->assertUnauthorized();
        $this->deleteJson('/api/authors/1/follow')->assertUnauthorized();
        $this->getJson('/api/following')->assertUnauthorized();
        $this->getJson('/api/following/feed')->assertUnauthorized();
    }

    public function test_repeated_follows_create_one_relationship_for_the_authenticated_reader(): void
    {
        $reader = User::factory()->create();
        $author = User::factory()->create();
        $other = User::factory()->create();
        Sanctum::actingAs($reader);
        for ($i = 0; $i < 2; $i++) {
            $this->putJson("/api/authors/{$author->id}/follow", ['follower_id' => $other->id, 'author_id' => $other->id])
                ->assertOk()->assertExactJson(['is_following' => true, 'followers_count' => 1]);
        }
        $this->assertDatabaseCount('author_follows', 1);
        $this->assertDatabaseHas('author_follows', ['follower_id' => $reader->id, 'author_id' => $author->id]);
        $this->getJson("/api/authors/{$author->id}")->assertOk()->assertJsonPath('followers_count', 1)->assertJsonPath('is_following', true);
        $this->getJson("/api/authors/{$reader->id}")->assertOk()->assertJsonPath('following_count', 1)->assertJsonPath('is_following', false);
    }

    public function test_self_missing_and_inactive_authors_cannot_be_followed(): void
    {
        $reader = User::factory()->create();
        $inactive = User::factory()->create(['is_active' => false]);
        Sanctum::actingAs($reader);
        $this->putJson("/api/authors/{$reader->id}/follow")->assertUnprocessable();
        $this->putJson("/api/authors/{$inactive->id}/follow")->assertNotFound();
        $this->putJson('/api/authors/999999/follow')->assertNotFound();
        $this->assertDatabaseCount('author_follows', 0);
    }

    public function test_unfollowing_is_idempotent_and_never_removes_another_readers_follow(): void
    {
        $reader = User::factory()->create();
        $other = User::factory()->create();
        $author = User::factory()->create();
        $reader->following()->attach($author->id);
        $other->following()->attach($author->id);
        Sanctum::actingAs($reader);
        for ($i = 0; $i < 2; $i++) {
            $this->deleteJson("/api/authors/{$author->id}/follow", ['follower_id' => $other->id])
                ->assertOk()->assertExactJson(['is_following' => false, 'followers_count' => 1]);
        }
        $this->assertDatabaseCount('author_follows', 1);
        $this->assertDatabaseHas('author_follows', ['follower_id' => $other->id, 'author_id' => $author->id]);
        $this->getJson('/api/following')->assertOk()->assertJsonPath('total', 0);
    }

    public function test_follow_state_is_private_to_the_viewer_and_works_with_bearer_tokens(): void
    {
        $reader = User::factory()->create();
        $other = User::factory()->create();
        $author = User::factory()->create();
        $reader->following()->attach($author->id);
        $this->getJson("/api/authors/{$author->id}")->assertOk()->assertJsonPath('is_following', false);
        $this->withToken($reader->createToken('follow-reader')->plainTextToken)
            ->getJson("/api/authors/{$author->id}")->assertOk()->assertJsonPath('is_following', true);
        // A new request with another reader must not reuse the first reader's state.
        auth()->forgetGuards();
        $this->withToken($other->createToken('follow-other')->plainTextToken)
            ->getJson("/api/authors/{$author->id}")->assertOk()->assertJsonPath('is_following', false);
    }

    public function test_the_feed_only_contains_visible_published_posts_from_followed_active_authors(): void
    {
        $reader = User::factory()->create();
        $author = User::factory()->create();
        $unfollowed = User::factory()->create();
        $inactive = User::factory()->create(['is_active' => false]);
        $reader->following()->attach([$author->id, $inactive->id]);
        $visible = $this->blog($author);
        $this->blog($author, ['status' => 'draft']);
        $this->blog($author, ['status' => 'scheduled', 'scheduled_at' => now()->addDay()]);
        $deleted = $this->blog($author);
        $deleted->delete();
        $this->blog($unfollowed);
        $this->blog($inactive);
        $this->blog($reader);
        $reader->likedBlogs()->attach($visible->id);
        Sanctum::actingAs($reader);

        $response = $this->getJson('/api/following/feed')->assertOk()
            ->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $visible->id)
            ->assertJsonPath('data.0.likes_count', 1)
            ->assertJsonStructure(['data' => [['user' => ['name', 'bio', 'avatar_url'], 'categories', 'tags']]]);
        $this->assertArrayNotHasKey('email', $response->json('data.0.user'));
        $this->assertArrayNotHasKey('role', $response->json('data.0.user'));
        $this->deleteJson("/api/authors/{$author->id}/follow")->assertOk();
        $this->getJson('/api/following/feed')->assertOk()->assertJsonPath('total', 0);
    }

    public function test_a_readers_followed_author_list_is_paginated_and_does_not_expose_private_fields(): void
    {
        $reader = User::factory()->create();
        $authors = User::factory()->count(13)->create();
        $reader->following()->attach($authors->modelKeys());
        $inactive = User::factory()->create(['is_active' => false]);
        $reader->following()->attach($inactive->id);
        $other = User::factory()->create();
        $other->following()->attach(User::factory()->create()->id);
        Sanctum::actingAs($reader);

        $response = $this->getJson('/api/following')->assertOk()
            ->assertJsonPath('total', 13)->assertJsonPath('last_page', 2)->assertJsonCount(12, 'data')
            ->assertJsonPath('data.0.followers_count', 1);
        foreach (['email', 'role', 'is_active', 'password', 'pivot'] as $field) {
            $this->assertArrayNotHasKey($field, $response->json('data.0'));
        }
        $this->getJson('/api/following?page=2')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/authors/{$reader->id}")->assertOk()->assertJsonPath('following_count', 13);
    }

    public function test_feed_pagination_is_scoped_to_the_current_reader(): void
    {
        $reader = User::factory()->create();
        $other = User::factory()->create();
        $author = User::factory()->create();
        $reader->following()->attach($author->id);
        for ($i = 0; $i < 13; $i++) $this->blog($author);
        Sanctum::actingAs($reader);
        $this->getJson('/api/following/feed')->assertOk()->assertJsonPath('total', 13)->assertJsonCount(12, 'data');
        $this->getJson('/api/following/feed?page=2')->assertOk()->assertJsonCount(1, 'data');
        Sanctum::actingAs($other);
        $this->getJson('/api/following/feed')->assertOk()->assertJsonPath('total', 0);
    }

    public function test_scheduled_posts_enter_the_feed_after_publication(): void
    {
        $reader = User::factory()->create();
        $author = User::factory()->create();
        $reader->following()->attach($author->id);
        $blog = $this->blog($author, ['status' => 'scheduled', 'scheduled_at' => now()->addMinute(), 'published_at' => null]);
        Sanctum::actingAs($reader);
        $this->getJson('/api/following/feed')->assertOk()->assertJsonPath('total', 0);
        $this->travel(2)->minutes();
        $this->artisan('blogs:publish-scheduled')->assertSuccessful();
        $this->getJson('/api/following/feed')->assertOk()->assertJsonPath('data.0.id', $blog->id);
    }

    public function test_inactive_followers_are_excluded_from_public_counts_and_inactive_authors_can_be_unfollowed(): void
    {
        $reader = User::factory()->create();
        $inactive = User::factory()->create(['is_active' => false]);
        $author = User::factory()->create();
        $reader->following()->attach([$author->id, $inactive->id]);
        $inactive->following()->attach($author->id);
        $this->getJson("/api/authors/{$author->id}")->assertOk()->assertJsonPath('followers_count', 1);
        Sanctum::actingAs($reader);
        $this->deleteJson("/api/authors/{$inactive->id}/follow")->assertOk()->assertJsonPath('is_following', false);
        $this->assertDatabaseMissing('author_follows', ['follower_id' => $reader->id, 'author_id' => $inactive->id]);
    }

    public function test_deleting_either_account_cleans_up_follow_relationships(): void
    {
        $reader = User::factory()->create();
        $author = User::factory()->create();
        $reader->following()->attach($author->id);
        $author->delete();
        $this->assertDatabaseCount('author_follows', 0);
        $otherAuthor = User::factory()->create();
        $reader->following()->attach($otherAuthor->id);
        $reader->delete();
        $this->assertDatabaseCount('author_follows', 0);
    }

    private function blog(User $author, array $attributes = []): Blog
    {
        return $author->blogs()->create(array_merge([
            'title' => 'A followed article', 'slug' => (string) Str::uuid(), 'content' => '<p>Content</p>',
            'status' => 'published', 'published_at' => now(),
        ], $attributes));
    }
}
