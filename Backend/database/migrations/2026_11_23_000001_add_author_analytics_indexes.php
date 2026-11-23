<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['blog_views', 'blog_likes', 'comments'] as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->index(['blog_id', 'created_at']));
        }
    }

    public function down(): void
    {
        foreach (['blog_views', 'blog_likes', 'comments'] as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex(['blog_id', 'created_at']));
        }
    }
};
