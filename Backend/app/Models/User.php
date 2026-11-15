<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Builder;

class User extends Authenticatable
{
    public const PROFILE_FIELDS = ['id', 'name', 'bio', 'avatar', 'created_at'];

    protected $appends = ['avatar_url'];
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'bio',
        'avatar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function blogs(): HasMany
    {
        return $this->hasMany(Blog::class);
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(fn () => $this->avatar ? asset('storage/'.$this->avatar) : null);
    }

    public function savedBlogs(): BelongsToMany
    {
        return $this->belongsToMany(Blog::class, 'bookmarks')->withTimestamps();
    }

    public function likedBlogs(): BelongsToMany
    {
        return $this->belongsToMany(Blog::class, 'blog_likes')->withTimestamps();
    }

    public function following(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'author_follows', 'follower_id', 'author_id')->withTimestamps();
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'author_follows', 'author_id', 'follower_id')->withTimestamps();
    }

    public function scopeWithProfileCounts(Builder $query): Builder
    {
        return $query->withCount([
            'blogs as published_blogs_count' => fn ($blogs) => $blogs->where('status', 'published'),
            'followers' => fn ($users) => $users->where('is_active', true),
            'following' => fn ($users) => $users->where('is_active', true),
        ]);
    }
}
