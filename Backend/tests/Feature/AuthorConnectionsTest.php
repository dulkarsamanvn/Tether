<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorConnectionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_lists_show_the_requested_relationship_direction(): void
    {
        $author = User::factory()->create();
        $follower = User::factory()->create();
        $followed = User::factory()->create();
        $unrelated = User::factory()->create();
        $follower->following()->attach($author->id);
        $author->following()->attach($followed->id);
        $unrelated->following()->attach($followed->id);

        $this->getJson("/api/authors/{$author->id}/followers")->assertOk()
            ->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $follower->id);
        $this->getJson("/api/authors/{$author->id}/following")->assertOk()
            ->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $followed->id);
        $this->assertDatabaseCount('author_follows', 3);
    }

    public function test_both_lists_paginate_active_public_profiles_without_exposing_account_fields(): void
    {
        $author = User::factory()->create();
        $people = User::factory()->count(13)->create();
        $inactive = User::factory()->create(['is_active' => false]);
        $ids = [...$people->modelKeys(), $inactive->id];
        $author->following()->attach($ids);
        $author->followers()->attach($ids);
        $publicFields = [...User::PROFILE_FIELDS, 'avatar_url', 'published_blogs_count', 'followers_count', 'following_count', 'is_following'];

        foreach (['followers', 'following'] as $kind) {
            $first = $this->getJson("/api/authors/{$author->id}/{$kind}")->assertOk()
                ->assertJsonPath('total', 13)->assertJsonPath('last_page', 2)->assertJsonCount(12, 'data');
            $second = $this->getJson("/api/authors/{$author->id}/{$kind}?page=2")->assertOk()->assertJsonCount(1, 'data');
            $rows = [...$first->json('data'), ...$second->json('data')];
            $this->assertEqualsCanonicalizing($people->modelKeys(), array_column($rows, 'id'));
            foreach ($rows as $row) {
                $this->assertEqualsCanonicalizing($publicFields, array_keys($row));
                $this->assertSame(1, $row['followers_count']);
                $this->assertSame(1, $row['following_count']);
                $this->assertSame(0, $row['published_blogs_count']);
                $this->assertFalse($row['is_following']);
            }
            $this->getJson("/api/authors/{$author->id}")->assertOk()->assertJsonPath("{$kind}_count", 13);
        }
    }

    public function test_follow_buttons_reflect_the_current_viewer_in_both_public_lists(): void
    {
        $author = User::factory()->create();
        $people = User::factory()->count(2)->create();
        $viewer = User::factory()->create();
        $otherViewer = User::factory()->create();
        $author->following()->attach($people->modelKeys());
        $author->followers()->attach($people->modelKeys());
        $viewer->following()->attach($people[0]->id);

        foreach (['followers', 'following'] as $kind) {
            $url = "/api/authors/{$author->id}/{$kind}";
            $guestRows = $this->getJson($url)->assertOk()->json('data');
            $this->assertSame([false, false], array_column($guestRows, 'is_following'));
            $rows = $this->withToken($viewer->createToken('connections')->plainTextToken)
                ->getJson($url)->assertOk()->json('data');
            $state = array_column($rows, 'is_following', 'id');
            $this->assertTrue($state[$people[0]->id]);
            $this->assertFalse($state[$people[1]->id]);
            auth()->forgetGuards();
            $otherRows = $this->withToken($otherViewer->createToken('connections-other')->plainTextToken)
                ->getJson($url)->assertOk()->json('data');
            $this->assertSame([false, false], array_column($otherRows, 'is_following'));
            auth()->forgetGuards();
            $this->withHeaders(['Authorization' => '']);
        }
    }

    public function test_inactive_and_missing_profiles_do_not_have_public_lists(): void
    {
        $inactive = User::factory()->create(['is_active' => false]);
        foreach (['followers', 'following'] as $kind) {
            $this->getJson("/api/authors/{$inactive->id}/{$kind}")->assertNotFound();
            $this->getJson("/api/authors/999999/{$kind}")->assertNotFound();
        }
    }

    public function test_empty_connection_lists_return_valid_pagination(): void
    {
        $author = User::factory()->create();
        foreach (['followers', 'following'] as $kind) {
            $this->getJson("/api/authors/{$author->id}/{$kind}")->assertOk()
                ->assertJsonPath('total', 0)->assertJsonPath('last_page', 1)
                ->assertJsonPath('current_page', 1)->assertJsonCount(0, 'data');
        }
    }
}
