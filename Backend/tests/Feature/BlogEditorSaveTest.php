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

class BlogEditorSaveTest extends TestCase
{
    use RefreshDatabase;

    public function test_explicitly_publishing_recovered_edits_applies_image_and_taxonomy_removals(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('blogs/original.jpg', 'original cover');
        $author = User::factory()->create();
        $blog = $this->createBlog($author);
        $category = Category::create(['name' => 'Technology', 'slug' => 'technology']);
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $blog->categories()->attach($category->id);
        $blog->tags()->attach($tag->id);
        $publicationDate = $blog->fresh()->getRawOriginal('published_at');
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$blog->id}", [
            'title' => 'Recovered title',
            'content' => '<p>Recovered content.</p>',
            'status' => 'published',
            'remove_featured_image' => '1',
            // Empty multipart fields are converted to null by Laravel.
            'category_ids' => '',
            'tag_ids' => '',
        ])->assertOk()
            ->assertJsonPath('blog.featured_image', null)
            ->assertJsonPath('blog.status', 'published')
            ->assertJsonCount(0, 'blog.categories')
            ->assertJsonCount(0, 'blog.tags');

        Storage::disk('public')->assertMissing('blogs/original.jpg');
        $this->assertSame($publicationDate, $blog->fresh()->getRawOriginal('published_at'));
        $this->getJson("/api/blogs/{$blog->id}")->assertOk()->assertJsonPath('content', '<p>Recovered content.</p>');
    }

    public function test_other_authors_cannot_remove_a_posts_cover_image(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('blogs/original.jpg', 'original cover');
        $blog = $this->createBlog(User::factory()->create());
        Sanctum::actingAs(User::factory()->create());

        $this->putJson("/api/blogs/{$blog->id}", ['remove_featured_image' => true])->assertNotFound();

        Storage::disk('public')->assertExists('blogs/original.jpg');
        $this->assertSame('blogs/original.jpg', $blog->fresh()->featured_image);
    }

    public function test_failed_validation_keeps_the_current_cover_and_published_content(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('blogs/original.jpg', 'original cover');
        $author = User::factory()->create();
        $blog = $this->createBlog($author);
        Sanctum::actingAs($author);

        $this->putJson("/api/blogs/{$blog->id}", ['title' => '', 'remove_featured_image' => true])
            ->assertUnprocessable();

        Storage::disk('public')->assertExists('blogs/original.jpg');
        $this->assertSame('Original title', $blog->fresh()->title);
        $this->assertSame('published', $blog->fresh()->status);
    }

    private function createBlog(User $author): Blog
    {
        return $author->blogs()->create([
            'title' => 'Original title',
            'slug' => (string) Str::uuid(),
            'content' => '<p>Original content.</p>',
            'featured_image' => 'blogs/original.jpg',
            'status' => 'published',
            'published_at' => now()->subDay(),
        ]);
    }
}
