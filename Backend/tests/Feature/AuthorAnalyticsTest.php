<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/author/analytics';

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-23 12:00:00', 'UTC'));
    }

    public function test_analytics_requires_an_active_authenticated_author(): void
    {
        $this->getJson(self::URL)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['is_active' => false]));
        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_new_authors_receive_zero_filled_days_and_empty_results(): void
    {
        $this->login();
        $response = $this->getJson(self::URL)->assertOk()->assertJsonPath('range', [
            'start_date' => '2026-10-25', 'end_date' => '2026-11-23', 'days' => 30, 'timezone' => 'UTC',
        ])->assertJsonPath('summary', ['views' => 0, 'likes' => 0, 'comments' => 0, 'posts_published' => 0])
            ->assertJsonCount(30, 'daily')->assertJsonCount(0, 'posts.data')->assertJsonPath('posts.total', 0)
            ->assertJsonPath('comparison.start_date', '2026-09-25')->assertJsonPath('comparison.end_date', '2026-10-24');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        foreach ($response->json('daily') as $day) {
            $this->assertSame(['date', 'views', 'likes', 'comments', 'posts_published'], array_keys($day));
            $this->assertSame(0, $day['views'] + $day['likes'] + $day['comments'] + $day['posts_published']);
        }
    }

    public function test_activity_is_scoped_to_owned_published_posts_and_excludes_own_views(): void
    {
        $author = $this->login();
        $published = $this->createPost($author);
        $reader = User::factory()->create();
        $this->activity($published, '2026-11-23 09:00:00', $reader);
        DB::table('blog_views')->insert(['blog_id' => $published->id, 'user_id' => $author->id, 'ip_address' => '192.0.2.100', 'created_at' => '2026-11-23 10:00:00', 'updated_at' => now()]);
        foreach ([$this->createPost($author, 'draft'), $this->createPost($author, 'scheduled'), $this->createPost(User::factory()->create())] as $hidden) {
            $this->activity($hidden, '2026-11-23 09:00:00', $reader);
        }
        $trashed = $this->createPost($author);
        $this->activity($trashed, '2026-11-23 09:00:00', $reader);
        $trashed->delete();
        $response = $this->getJson(self::URL.'?author_id=999999')->assertOk()
            ->assertJsonPath('summary', ['views' => 1, 'likes' => 1, 'comments' => 1, 'posts_published' => 1])
            ->assertJsonPath('library', ['published_posts' => 1, 'draft_posts' => 1, 'scheduled_posts' => 1])
            ->assertJsonCount(1, 'posts.data')->assertJsonPath('posts.data.0.id', $published->id)
            ->assertJsonPath('posts.data.0.views', 1)->assertJsonPath('posts.data.0.likes', 1)->assertJsonPath('posts.data.0.comments', 1);
        foreach (['ip_address', '192.0.2.100', $reader->email, 'user_id', 'content'] as $private) $this->assertStringNotContainsString($private, $response->getContent());
    }

    public function test_custom_dates_include_whole_days_and_compare_the_equal_previous_period(): void
    {
        $author = $this->login();
        $post = $this->createPost($author, 'published', '2026-11-20 00:00:00');
        foreach (['2026-11-17 23:59:59', '2026-11-18 00:00:00', '2026-11-19 23:59:59', '2026-11-20 00:00:00', '2026-11-21 23:59:59', '2026-11-22 00:00:00'] as $date) $this->activity($post, $date);
        $this->getJson(self::URL.'?start_date=2026-11-20&end_date=2026-11-21')->assertOk()
            ->assertJsonPath('range.days', 2)->assertJsonPath('summary.views', 2)->assertJsonPath('summary.likes', 2)->assertJsonPath('summary.comments', 2)
            ->assertJsonPath('comparison.start_date', '2026-11-18')->assertJsonPath('comparison.end_date', '2026-11-19')
            ->assertJsonPath('comparison.summary.views', 2)->assertJsonPath('comparison.summary.posts_published', 0)
            ->assertJsonPath('daily.0', ['date' => '2026-11-20', 'views' => 1, 'likes' => 1, 'comments' => 1, 'posts_published' => 1])
            ->assertJsonPath('daily.1', ['date' => '2026-11-21', 'views' => 1, 'likes' => 1, 'comments' => 1, 'posts_published' => 0])
            ->assertJsonPath('posts.data.0.views', 2);
    }

    public function test_daily_counts_match_the_summary_and_gaps_are_zero_filled(): void
    {
        $author = $this->login();
        $post = $this->createPost($author, 'published', '2026-11-01 12:00:00');
        $this->activity($post, '2026-11-20 12:00:00');
        $this->activity($post, '2026-11-23 23:59:59');
        $data = $this->getJson(self::URL.'?start_date=2026-11-20&end_date=2026-11-23')->assertOk()->json();
        foreach (['views', 'likes', 'comments', 'posts_published'] as $metric) $this->assertSame($data['summary'][$metric], array_sum(array_column($data['daily'], $metric)));
        $this->assertSame(0, $data['daily'][1]['views']);
        $this->assertSame(0, $data['daily'][2]['views']);
        $this->assertSame(0, $data['summary']['posts_published']);
        $this->assertSame(1, $data['posts']['total'], 'Old posts still receive activity in the selected period.');
    }

    public function test_removed_likes_and_comments_do_not_remain_in_the_report(): void
    {
        $author = $this->login();
        $post = $this->createPost($author);
        $reader = User::factory()->create();
        $this->activity($post, '2026-11-23 09:00:00', $reader);
        DB::table('blog_likes')->delete();
        DB::table('comments')->delete();
        $post->forceFill(['view_count' => 999])->save();
        $this->getJson(self::URL)->assertOk()->assertJsonPath('summary.views', 1)->assertJsonPath('summary.likes', 0)->assertJsonPath('summary.comments', 0);
    }

    public function test_each_ranking_uses_period_counts_and_stable_pagination(): void
    {
        $author = $this->login();
        $posts = [];
        for ($i = 0; $i < 12; $i++) $posts[] = $this->createPost($author);
        $this->activity($posts[0], '2026-11-23 09:00:00');
        DB::table('blog_likes')->insert(['blog_id' => $posts[1]->id, 'user_id' => User::factory()->create()->id, 'created_at' => '2026-11-23 10:00:00', 'updated_at' => now()]);
        DB::table('blog_likes')->insert(['blog_id' => $posts[1]->id, 'user_id' => User::factory()->create()->id, 'created_at' => '2026-11-23 10:00:00', 'updated_at' => now()]);
        for ($i = 0; $i < 3; $i++) $posts[2]->comments()->create(['user_id' => $author->id, 'body' => 'A reply']);
        foreach (['views' => 0, 'likes' => 1, 'comments' => 2] as $sort => $index) {
            $first = $this->getJson(self::URL.'?sort='.$sort)->assertOk()->assertJsonPath('posts.total', 12)->assertJsonCount(10, 'posts.data')->assertJsonPath('posts.data.0.id', $posts[$index]->id)->json('posts.data');
            $second = $this->getJson(self::URL.'?sort='.$sort.'&page=2')->assertOk()->assertJsonCount(2, 'posts.data')->json('posts.data');
            $this->assertCount(12, array_unique(array_column([...$first, ...$second], 'id')));
        }
    }

    public function test_date_and_sort_validation_rejects_bad_and_excessive_ranges(): void
    {
        $this->login();
        foreach ([
            '?start_date=2026-11-20', '?end_date=2026-11-23', '?start_date=2026-02-30&end_date=2026-03-01',
            '?start_date=2026-11-23&end_date=2026-11-20', '?start_date=2025-01-01&end_date=2026-11-23',
            '?start_date=2026-11-20&end_date=2026-11-24', '?sort=views;DROP', '?sort[]=views', '?page=0', '?page=1000001',
        ] as $query) $this->getJson(self::URL.$query)->assertUnprocessable();
        $this->getJson(self::URL.'?start_date=2026-11-23&end_date=2026-11-23')->assertOk()->assertJsonCount(1, 'daily')->assertJsonPath('range.days', 1);
        $this->getJson(self::URL.'?start_date=2025-11-23&end_date=2026-11-23')->assertOk()->assertJsonCount(366, 'daily');
    }

    public function test_utc_dates_are_stable_when_the_application_timezone_differs(): void
    {
        $author = $this->login();
        $post = $this->createPost($author);
        $this->activity($post, '2026-11-22 23:59:59');
        $this->activity($post, '2026-11-23 00:00:00');
        config(['app.timezone' => 'Asia/Kolkata']);
        $this->getJson(self::URL.'?start_date=2026-11-23&end_date=2026-11-23')->assertOk()->assertJsonPath('summary.views', 1)->assertJsonPath('range.timezone', 'UTC');
    }

    private function login(): User
    {
        $user = User::factory()->create(['is_active' => true]);
        Sanctum::actingAs($user);
        return $user;
    }

    private function createPost(User $author, string $status = 'published', string $publishedAt = '2026-11-23 08:00:00'): Blog
    {
        return $author->blogs()->create(['title' => 'Analytics post '.Str::random(8), 'slug' => Str::uuid()->toString(), 'content' => '<p>Private post content</p>', 'status' => $status, 'published_at' => $status === 'published' ? $publishedAt : null]);
    }

    private function activity(Blog $post, string $date, ?User $reader = null): void
    {
        $reader ??= User::factory()->create();
        $common = ['blog_id' => $post->id, 'user_id' => $reader->id, 'created_at' => $date, 'updated_at' => $date];
        DB::table('blog_views')->insert([...$common, 'ip_address' => '192.0.2.1']);
        DB::table('blog_likes')->insert($common);
        DB::table('comments')->insert([...$common, 'body' => 'A thoughtful comment']);
    }
}
