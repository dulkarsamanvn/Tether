<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScheduledPublishingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2030-01-01 12:00:00', 'UTC'));
    }

    public function test_an_author_can_schedule_a_post_and_times_are_stored_in_utc(): void
    {
        $author = User::factory()->create();
        Sanctum::actingAs($author);

        $id = $this->postJson('/api/blogs', [
            'title' => 'A future post',
            'content' => '<p>Ready for publication.</p>',
            'status' => 'scheduled',
            'scheduled_at' => '2030-01-05T15:00:00+05:30',
            'scheduled_timezone' => 'Asia/Kolkata',
        ])->assertCreated()
            ->assertJsonPath('blog.status', 'scheduled')
            ->assertJsonPath('blog.published_at', null)
            ->assertJsonPath('blog.scheduled_timezone', 'Asia/Kolkata')
            ->json('blog.id');

        $this->assertSame('2030-01-05 09:30:00', Blog::findOrFail($id)->getRawOriginal('scheduled_at'));
        $this->getJson('/api/my-blogs?status=scheduled')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->getJson("/api/my-blogs/{$id}")->assertOk()->assertJsonPath('status', 'scheduled');
        $this->getJson('/api/blogs')->assertOk()->assertJsonPath('total', 0);
        $this->getJson("/api/blogs/{$id}")->assertNotFound();
        $this->getJson("/api/blogs/{$id}/comments")->assertNotFound();
        $this->postJson("/api/blogs/{$id}/comments", ['body' => 'Too early'])->assertNotFound();
        $this->putJson("/api/blogs/{$id}/like")->assertNotFound();
        $this->putJson("/api/blogs/{$id}/bookmark")->assertNotFound();
    }

    public function test_missing_invalid_and_non_future_publication_times_are_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create());
        foreach ([[], ['scheduled_at' => null], ['scheduled_at' => 'not a date'],
            ['scheduled_at' => '2030-01-01T11:59:00Z'], ['scheduled_at' => '2030-01-01T12:00:00Z'],
            ['scheduled_at' => '2030-01-02 12:00:00']] as $time) {
            $this->postJson('/api/blogs', array_merge([
                'title' => 'Not scheduled', 'content' => '<p>Content</p>', 'status' => 'scheduled',
            ], $time))->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
        }

        $this->postJson('/api/blogs', [
            'title' => 'Bad zone', 'content' => '<p>Content</p>', 'status' => 'scheduled',
            'scheduled_at' => '2030-01-02T12:00:00Z', 'scheduled_timezone' => 'Not/A_Zone',
        ])->assertUnprocessable()->assertJsonValidationErrors('scheduled_timezone');
        $this->assertDatabaseCount('blogs', 0);
    }

    public function test_an_author_can_reschedule_without_publishing_at_the_old_time(): void
    {
        $author = User::factory()->create();
        $blog = $this->createBlog($author);
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$blog->id}", [
            'status' => 'scheduled', 'scheduled_at' => '2030-01-03T10:00:00Z', 'scheduled_timezone' => 'UTC',
        ])->assertOk()->assertJsonPath('blog.status', 'scheduled');

        $this->travelTo(Carbon::parse('2030-01-02T12:00:00Z'));
        $this->artisan('blogs:publish-scheduled')->assertSuccessful();
        $this->assertSame('scheduled', $blog->fresh()->status);
        $this->travelTo(Carbon::parse('2030-01-03T10:00:00Z'));
        $this->artisan('blogs:publish-scheduled')->assertSuccessful();
        $this->assertSame('published', $blog->fresh()->status);
    }

    public function test_a_draft_can_be_scheduled_and_saving_it_as_draft_clears_its_schedule(): void
    {
        $author = User::factory()->create();
        $blog = $this->createBlog($author, ['status' => 'draft', 'scheduled_at' => null, 'scheduled_timezone' => null]);
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$blog->id}", ['status' => 'scheduled'])
            ->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
        $this->putJson("/api/blogs/{$blog->id}", [
            'status' => 'scheduled', 'scheduled_at' => '2030-01-03T10:00:00.000Z',
        ])->assertOk()->assertJsonPath('blog.status', 'scheduled')->assertJsonPath('blog.scheduled_timezone', 'UTC');
        $this->putJson("/api/blogs/{$blog->id}", ['scheduled_at' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
        $this->putJson("/api/blogs/{$blog->id}", ['status' => 'draft'])->assertOk()
            ->assertJsonPath('blog.scheduled_at', null)->assertJsonPath('blog.scheduled_timezone', null);
        $this->assertSame('draft', $blog->fresh()->status);
    }

    public function test_editing_a_scheduled_post_without_a_new_time_preserves_its_schedule(): void
    {
        $author = User::factory()->create();
        $blog = $this->createBlog($author);
        $original = $blog->fresh()->getRawOriginal('scheduled_at');
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$blog->id}", ['title' => 'Updated title'])->assertOk();
        $this->assertSame($original, $blog->fresh()->getRawOriginal('scheduled_at'));
        $this->assertSame('scheduled', $blog->fresh()->status);
    }

    public function test_cancelling_a_schedule_keeps_the_post_as_a_private_draft(): void
    {
        $author = User::factory()->create();
        $blog = $this->createBlog($author);
        Sanctum::actingAs($author);

        $this->deleteJson("/api/blogs/{$blog->id}/schedule")->assertOk()
            ->assertJsonPath('blog.status', 'draft')
            ->assertJsonPath('blog.scheduled_at', null)
            ->assertJsonPath('blog.scheduled_timezone', null);
        $this->travel(3)->days();
        $this->artisan('blogs:publish-scheduled')->assertSuccessful();
        $this->assertSame('draft', $blog->fresh()->status);
        $this->assertNull($blog->fresh()->published_at);
        $this->getJson('/api/blogs')->assertOk()->assertJsonPath('total', 0);
    }

    public function test_schedule_actions_require_authentication_and_ownership(): void
    {
        $owner = User::factory()->create();
        $blog = $this->createBlog($owner);
        $this->deleteJson("/api/blogs/{$blog->id}/schedule")->assertUnauthorized();
        $this->putJson("/api/blogs/{$blog->id}", ['status' => 'scheduled'])->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        $this->deleteJson("/api/blogs/{$blog->id}/schedule")->assertNotFound();
        $this->putJson("/api/blogs/{$blog->id}", ['status' => 'scheduled', 'scheduled_at' => '2030-01-04T12:00:00Z'])->assertNotFound();
        $this->assertSame('scheduled', $blog->fresh()->status);
    }

    public function test_the_publisher_only_publishes_due_visible_scheduled_posts_and_is_safe_to_rerun(): void
    {
        $author = User::factory()->create();
        $due = $this->createBlog($author, ['scheduled_at' => now()->subMinute()]);
        $exactlyDue = $this->createBlog($author, ['scheduled_at' => now()]);
        $future = $this->createBlog($author);
        $draft = $this->createBlog($author, ['status' => 'draft', 'scheduled_at' => now()->subDay()]);
        $published = $this->createBlog($author, ['status' => 'published', 'published_at' => now()->subDay()]);
        $missingTime = $this->createBlog($author, ['scheduled_at' => null]);
        $trashed = $this->createBlog($author, ['scheduled_at' => now()->subHour()]);
        $trashed->delete();
        $this->artisan('blogs:publish-scheduled')->expectsOutput('Published 2 scheduled blog(s).')->assertSuccessful();

        foreach ([$due, $exactlyDue] as $blog) {
            $this->assertSame('published', $blog->fresh()->status);
            $this->assertTrue($blog->fresh()->published_at->equalTo(now()));
            $this->assertNull($blog->fresh()->scheduled_at);
            $this->assertNull($blog->fresh()->scheduled_timezone);
        }
        $this->assertSame('scheduled', $future->fresh()->status);
        $this->assertSame('draft', $draft->fresh()->status);
        $this->assertSame('scheduled', $missingTime->fresh()->status);
        $this->assertTrue($published->fresh()->published_at->equalTo(now()->subDay()));
        $this->assertSoftDeleted($trashed);
        $this->assertSame('scheduled', Blog::withTrashed()->findOrFail($trashed->id)->status);
        $this->getJson('/api/blogs')->assertOk()->assertJsonPath('total', 3);

        $this->travel(5)->minutes();
        $this->artisan('blogs:publish-scheduled')->expectsOutput('Published 0 scheduled blog(s).')->assertSuccessful();
        $this->assertTrue($due->fresh()->published_at->equalTo(now()->subMinutes(5)));
    }

    public function test_publishing_now_clears_the_schedule_and_cannot_be_cancelled_back_to_draft(): void
    {
        $author = User::factory()->create();
        $blog = $this->createBlog($author);
        Sanctum::actingAs($author);
        $this->putJson("/api/blogs/{$blog->id}", ['status' => 'published'])->assertOk()
            ->assertJsonPath('blog.status', 'published')->assertJsonPath('blog.scheduled_at', null);
        $this->deleteJson("/api/blogs/{$blog->id}/schedule")->assertNotFound();
        $this->assertSame('published', $blog->fresh()->status);
        $this->getJson("/api/blogs/{$blog->id}")->assertOk();
    }

    public function test_a_post_that_has_already_published_cannot_be_rescheduled_by_a_stale_editor(): void
    {
        $author = User::factory()->create();
        $blog = $this->createBlog($author, ['scheduled_at' => now()]);
        $this->artisan('blogs:publish-scheduled')->assertSuccessful();
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$blog->id}", [
            'title' => 'Stale edits', 'status' => 'scheduled', 'scheduled_at' => '2030-01-04T12:00:00Z',
        ])->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->assertSame('Scheduled article', $blog->fresh()->title);
        $this->assertSame('published', $blog->fresh()->status);
    }

    public function test_restoring_future_schedules_resumes_them_but_expired_schedules_return_as_drafts(): void
    {
        $author = User::factory()->create();
        $future = $this->createBlog($author);
        $expired = $this->createBlog($author, ['scheduled_at' => now()->subMinute()]);
        $future->delete();
        $expired->delete();
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$future->id}/restore")->assertOk()->assertJsonPath('blog.status', 'scheduled');
        $this->putJson("/api/blogs/{$expired->id}/restore")->assertOk()
            ->assertJsonPath('blog.status', 'draft')->assertJsonPath('blog.scheduled_at', null);
        $this->artisan('blogs:publish-scheduled')->assertSuccessful();
        $this->assertSame('draft', $expired->fresh()->status);
        $this->assertSame('scheduled', $future->fresh()->status);
    }

    public function test_the_command_is_registered_to_run_every_minute_without_overlapping(): void
    {
        $events = collect(app(Schedule::class)->events())
            ->filter(fn ($event) => str_contains($event->command ?? '', 'blogs:publish-scheduled'));
        $this->assertCount(1, $events);
        $this->assertSame('* * * * *', $events->first()->expression);
        $this->assertTrue($events->first()->withoutOverlapping);
    }

    private function createBlog(User $author, array $attributes = []): Blog
    {
        return $author->blogs()->create(array_merge([
            'title' => 'Scheduled article', 'slug' => (string) Str::uuid(),
            'content' => '<p>Scheduled content.</p>', 'status' => 'scheduled',
            'scheduled_at' => now()->addDay(), 'scheduled_timezone' => 'UTC',
        ], $attributes));
    }
}
