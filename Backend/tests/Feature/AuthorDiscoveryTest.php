<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthorDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_discovery_only_lists_active_authors_with_visible_published_posts(): void
    {
        $published = $this->author(['bio' => 'A public bio.']);
        User::factory()->create();
        $inactive = $this->author(['is_active' => false]);
        $draft = User::factory()->create();
        $this->createPost($draft, 'draft');
        $scheduled = User::factory()->create();
        $this->createPost($scheduled, 'scheduled');
        $trashed = $this->author();
        $trashed->blogs()->first()->delete();
        $this->createPost($published, 'draft');
        $this->createPost($published, 'scheduled');
        $this->createPost($published)->delete();
        $published->followers()->attach($inactive->id);

        $row = $this->getJson('/api/authors')->assertOk()->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $published->id)
            ->assertJsonPath('data.0.published_blogs_count', 1)
            ->assertJsonPath('data.0.followers_count', 0)->json('data.0');
        $this->assertEqualsCanonicalizing([
            ...User::PROFILE_FIELDS, 'avatar_url', 'published_blogs_count',
            'followers_count', 'following_count', 'is_following',
        ], array_keys($row));
        $this->assertFalse($row['is_following']);
    }

    public function test_search_matches_names_and_bios_across_pages_and_keeps_visibility_filters_grouped(): void
    {
        for ($i = 0; $i < 13; $i++) $this->author(['name' => "Writer {$i}", 'bio' => null]);
        $byName = $this->author(['name' => 'Alpine Stories', 'bio' => null]);
        $byBio = $this->author(['name' => 'Another writer', 'bio' => 'Exploring alpine trails.']);
        $this->author(['is_active' => false, 'bio' => 'alpine']);
        User::factory()->create(['bio' => 'alpine']);

        $rows = $this->getJson('/api/authors?q=%20ALPINE%20')->assertOk()
            ->assertJsonPath('total', 2)->json('data');
        $this->assertEqualsCanonicalizing([$byName->id, $byBio->id], array_column($rows, 'id'));
        $this->getJson('/api/authors?q=unmatched')->assertOk()->assertJsonPath('total', 0)->assertJsonCount(0, 'data');
    }

    public function test_search_treats_wildcards_and_bound_parameters_as_literal_text(): void
    {
        $percent = $this->author(['name' => '100% Stories', 'bio' => null]);
        $underscore = $this->author(['name' => 'my_writer', 'bio' => null]);
        $bang = $this->author(['name' => 'Hello!', 'bio' => null]);
        $apostrophe = $this->author(['name' => "O'Brien", 'bio' => null]);
        $zero = $this->author(['name' => 'Writer 0', 'bio' => null]);
        $this->author(['name' => 'Plain writer', 'bio' => null]);
        foreach (['%' => $percent, '_' => $underscore, '!' => $bang, "O'Brien" => $apostrophe] as $text => $author) {
            $this->getJson('/api/authors?q='.urlencode($text))->assertOk()
                ->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $author->id);
        }
        $rows = $this->getJson('/api/authors?q=0')->assertOk()->assertJsonPath('total', 2)->json('data');
        $this->assertEqualsCanonicalizing([$percent->id, $zero->id], array_column($rows, 'id'));
        $this->getJson('/api/authors?q='.urlencode("' OR 1=1 --"))->assertOk()->assertJsonPath('total', 0);
    }

    public function test_sorting_uses_public_counts_and_has_stable_tiebreakers(): void
    {
        $popular = $this->author(['created_at' => now()->subDays(10)]);
        $prolific = $this->author(['created_at' => now()->subDays(5)]);
        $newest = $this->author();
        $readers = User::factory()->count(3)->create();
        $popular->followers()->attach($readers->modelKeys());
        $prolific->followers()->attach($readers[0]->id);
        $inactive = User::factory()->count(4)->create(['is_active' => false]);
        $newest->followers()->attach($inactive->modelKeys());
        $this->createPost($prolific);
        $this->createPost($prolific);
        for ($i = 0; $i < 4; $i++) $this->createPost($newest, 'draft');

        foreach ([
            'followers' => [$popular->id, $prolific->id, $newest->id],
            'posts' => [$prolific->id, $newest->id, $popular->id],
            'newest' => [$newest->id, $prolific->id, $popular->id],
        ] as $sort => $expected) {
            $rows = $this->getJson("/api/authors?sort={$sort}")->assertOk()->json('data');
            $this->assertSame($expected, array_column($rows, 'id'));
        }
        $this->getJson('/api/authors')->assertOk()->assertJsonPath('data.0.id', $popular->id);
    }

    public function test_pagination_covers_all_matching_authors_without_duplicates(): void
    {
        $ids = [];
        for ($i = 0; $i < 13; $i++) $ids[] = $this->author(['name' => "Discovered {$i}"])->id;
        $this->author(['name' => 'Unrelated']);
        $first = $this->getJson('/api/authors?q=Discovered&sort=newest')->assertOk()
            ->assertJsonPath('total', 13)->assertJsonPath('last_page', 2)->assertJsonCount(12, 'data');
        $second = $this->getJson('/api/authors?q=Discovered&sort=newest&page=2')->assertOk()->assertJsonCount(1, 'data');
        $this->assertEqualsCanonicalizing($ids, [...array_column($first->json('data'), 'id'), ...array_column($second->json('data'), 'id')]);
        $this->assertStringContainsString('sort=newest', $first->json('next_page_url'));
        $this->assertStringContainsString('q=Discovered', $first->json('next_page_url'));
    }

    public function test_follow_state_is_scoped_to_the_viewer_and_does_not_hide_their_own_profile(): void
    {
        $viewer = $this->author();
        $author = $this->author();
        $otherViewer = User::factory()->create();
        $viewer->following()->attach($author->id);
        $this->getJson('/api/authors')->assertOk()->assertJsonPath('data.0.is_following', false);
        $rows = $this->withToken($viewer->createToken('discovery')->plainTextToken)
            ->getJson('/api/authors')->assertOk()->assertJsonPath('total', 2)->json('data');
        $states = array_column($rows, 'is_following', 'id');
        $this->assertTrue($states[$author->id]);
        $this->assertFalse($states[$viewer->id]);
        auth()->forgetGuards();
        $this->withToken($otherViewer->createToken('other-discovery')->plainTextToken)
            ->getJson('/api/authors')->assertOk()->assertJsonPath('data.0.is_following', false);
    }

    public function test_filters_are_validated_and_an_empty_directory_is_paginated(): void
    {
        foreach ([['q' => str_repeat('a', 101)], ['q' => ['bad']], ['sort' => 'unknown'], ['page' => 0], ['page' => 'oops']] as $filters) {
            $this->getJson('/api/authors?'.http_build_query($filters))->assertUnprocessable();
        }
        $this->getJson('/api/authors')->assertOk()->assertJsonPath('total', 0)
            ->assertJsonPath('last_page', 1)->assertJsonCount(0, 'data');
    }

    private function author(array $attributes = []): User
    {
        $author = User::factory()->create($attributes);
        $this->createPost($author);
        return $author;
    }

    private function createPost(User $author, string $status = 'published')
    {
        return $author->blogs()->create([
            'title' => 'Discovery post', 'slug' => (string) Str::uuid(), 'content' => '<p>Content</p>',
            'status' => $status, 'published_at' => $status === 'published' ? now() : null,
        ]);
    }
}
