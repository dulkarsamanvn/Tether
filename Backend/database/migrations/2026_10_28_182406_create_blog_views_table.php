<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blog_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('ip_address', 45)->nullable(); // fallback for guests
            $table->timestamps();

            // Prevent duplicate views: one record per user per blog, or per IP per blog
            $table->unique(['blog_id', 'user_id']);
            $table->index(['blog_id', 'ip_address']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_views');
    }
};
