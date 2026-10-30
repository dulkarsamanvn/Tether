<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\Category;
use App\Models\User;
use Database\Seeders\SampleBlogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SampleBlogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_adds_five_published_blogs_per_user_and_preserves_existing_content(): void
    {
        $users = User::factory()->count(3)->create();
        $existing = $users[0]->blogs()->create([
            'title' => 'An existing post',
            'slug' => 'existing-post',
            'content' => '<p>Keep this content.</p>',
            'status' => 'draft',
        ]);
        $category = Category::create(['name' => 'Technology', 'slug' => 'technology']);

        $this->seed(SampleBlogSeeder::class);

        $this->assertDatabaseCount('users', 3);
        $this->assertDatabaseCount('blogs', 16);
        $this->assertDatabaseCount('categories', 1);
        foreach ($users as $user) {
            $this->assertSame(5, $user->blogs()->where('status', 'published')->count());
        }
        $this->assertSame(6, $users[0]->blogs()->count());
        $this->assertSame(6, $category->blogs()->count());
        $this->assertSame('draft', $existing->fresh()->status);
        $this->assertSame('<p>Keep this content.</p>', $existing->fresh()->content);
    }

    public function test_reruns_do_not_duplicate_overwrite_or_restore_sample_blogs(): void
    {
        $user = User::factory()->create();
        $this->seed(SampleBlogSeeder::class);
        $edited = Blog::where('slug', "sample-user-{$user->id}-blog-1")->firstOrFail();
        $edited->update(['title' => 'My edited title', 'content' => '<p>My changes.</p>', 'status' => 'draft']);
        $deleted = Blog::where('slug', "sample-user-{$user->id}-blog-2")->firstOrFail();
        $deleted->delete();

        $this->seed(SampleBlogSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('blogs', 5);
        $this->assertSame(4, $user->blogs()->count());
        $this->assertSame('My edited title', $edited->fresh()->title);
        $this->assertSame('<p>My changes.</p>', $edited->fresh()->content);
        $this->assertSame('draft', $edited->fresh()->status);
        $this->assertSoftDeleted($deleted);
    }

    public function test_it_does_not_create_accounts_when_no_users_exist(): void
    {
        $this->seed(SampleBlogSeeder::class);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('blogs', 0);
    }
}
