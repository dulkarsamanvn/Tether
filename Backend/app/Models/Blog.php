<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Blog extends Model
{

    use HasFactory,SoftDeletes;

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'excerpt',
        'content',
        'featured_image',
        'status',
        'published_at',
        'meta_title',
        'meta_description',
        'is_featured',
        'allow_comments',
    ];
    protected $appends = ['featured_image_url'];


    protected function casts():array
    {
        return [
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
            'allow_comments' => 'boolean',
            'view_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function featuredImageUrl(): Attribute
    {
        return Attribute::get(function () {
            return $this->featured_image
                ? asset('storage/' . $this->featured_image)
                : null;
        });
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function blogViews(): HasMany
    {
        return $this->hasMany(BlogView::class);
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'blog_category');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'blog_tag');
    }

    public function bookmarkedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'bookmarks')->withTimestamps();
    }
}
