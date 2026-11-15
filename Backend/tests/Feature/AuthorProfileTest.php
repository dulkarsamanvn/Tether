<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_profiles_expose_only_public_fields_and_published_post_counts(): void
    {
        $author = User::factory()->create(['bio' => 'I write about technology.']);
        $this->blog($author);
        $this->blog($author, ['status' => 'draft']);
        $this->blog($author, ['status' => 'scheduled', 'scheduled_at' => now()->addDay()]);
        $deleted = $this->blog($author);
        $deleted->delete();

        $response = $this->getJson("/api/authors/{$author->id}")->assertOk()
            ->assertJsonPath('name', $author->name)->assertJsonPath('bio', $author->bio)
            ->assertJsonPath('avatar_url', null)->assertJsonPath('published_blogs_count', 1);
        foreach (['email', 'password', 'remember_token', 'role', 'is_active', 'email_verified_at'] as $field) {
            $this->assertArrayNotHasKey($field, $response->json());
        }
        $post = $this->getJson('/api/blogs')->assertOk()->json('data.0.user');
        $this->assertSame($author->id, $post['id']);
        $this->assertArrayNotHasKey('email', $post);
        $this->assertArrayNotHasKey('role', $post);
    }

    public function test_an_authors_article_list_is_paginated_and_excludes_other_or_private_posts(): void
    {
        $author = User::factory()->create();
        for ($i = 0; $i < 13; $i++) $this->blog($author);
        $this->blog(User::factory()->create());
        $this->blog($author, ['status' => 'draft']);
        $this->blog($author, ['status' => 'scheduled']);
        $deleted = $this->blog($author);
        $deleted->delete();
        $this->getJson("/api/authors/{$author->id}/blogs")->assertOk()
            ->assertJsonPath('total', 13)->assertJsonCount(12, 'data')
            ->assertJsonPath('data.0.user_id', $author->id);
        $this->getJson("/api/authors/{$author->id}/blogs?page=2")->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_missing_and_inactive_profiles_are_unavailable(): void
    {
        $inactive = User::factory()->create(['is_active' => false]);
        foreach ([$inactive->id, 999999] as $id) {
            $this->getJson("/api/authors/{$id}")->assertNotFound();
            $this->getJson("/api/authors/{$id}/blogs")->assertNotFound();
        }
    }

    public function test_editing_a_profile_requires_authentication(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
        $this->putJson('/api/profile', ['name' => 'No permission'])->assertUnauthorized();
    }

    public function test_profile_updates_apply_only_to_the_authenticated_account_and_allowed_fields(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        Sanctum::actingAs($owner);
        $this->getJson('/api/profile')->assertOk()->assertJsonPath('email', $owner->email);
        $this->putJson('/api/profile', [
            'id' => $other->id, 'user_id' => $other->id, 'name' => 'Updated name', 'bio' => 'My bio',
            'email' => 'overwritten@example.com', 'password' => 'overwritten', 'role' => 'admin', 'is_active' => false,
        ])->assertOk()->assertJsonPath('user.name', 'Updated name')->assertJsonPath('user.bio', 'My bio');
        $this->assertSame($other->name, $other->fresh()->name);
        $this->assertSame($owner->email, $owner->fresh()->email);
        $this->assertSame($owner->password, $owner->fresh()->password);
        $this->assertSame('user', $owner->fresh()->role);
        $this->assertTrue($owner->fresh()->is_active);
        $this->getJson("/api/authors/{$owner->id}")->assertOk()->assertJsonPath('bio', 'My bio');
    }

    public function test_avatar_upload_replacement_and_removal_preserve_other_users_images(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $other = User::factory()->create(['avatar' => 'avatars/other.png']);
        Storage::disk('public')->put($other->avatar, 'other image');
        Sanctum::actingAs($owner);
        $first = $this->post('/api/profile', ['_method' => 'PUT', 'avatar' => $this->image()])
            ->assertOk()->json('user.avatar');
        Storage::disk('public')->assertExists($first);
        $second = $this->post('/api/profile', ['_method' => 'PUT', 'avatar' => $this->image()])
            ->assertOk()->json('user.avatar');
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
        $this->getJson("/api/authors/{$owner->id}")->assertOk()
            ->assertJsonPath('avatar_url', asset('storage/'.$second));
        $this->putJson('/api/profile', ['remove_avatar' => true])->assertOk()->assertJsonPath('user.avatar_url', null);
        Storage::disk('public')->assertMissing($second);
        Storage::disk('public')->assertExists($other->avatar);
    }

    public function test_invalid_profile_changes_do_not_delete_the_existing_photo(): void
    {
        Storage::fake('public');
        $author = User::factory()->create(['avatar' => 'avatars/existing.png']);
        Storage::disk('public')->put($author->avatar, 'existing');
        Sanctum::actingAs($author);
        $this->putJson('/api/profile', ['name' => '', 'bio' => str_repeat('x', 1001), 'remove_avatar' => true])
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'bio']);
        $this->post('/api/profile', ['_method' => 'PUT', 'avatar' => UploadedFile::fake()->create('unsafe.svg', 1, 'image/svg+xml')], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors('avatar');
        Storage::disk('public')->assertExists($author->avatar);
        $this->assertSame($author->name, $author->fresh()->name);
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('avatar.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='));
    }

    private function blog(User $author, array $attributes = []): Blog
    {
        return $author->blogs()->create(array_merge([
            'title' => 'A public article', 'slug' => (string) Str::uuid(), 'content' => '<p>Public content</p>',
            'status' => 'published', 'published_at' => now(),
        ], $attributes));
    }
}
