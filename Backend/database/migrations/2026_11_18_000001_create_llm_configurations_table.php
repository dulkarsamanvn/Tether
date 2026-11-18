<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('llm_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('provider', 24);
            $table->string('model', 100);
            $table->text('api_key');
            $table->text('instructions')->nullable();
            $table->string('status', 16)->default('untested');
            $table->boolean('is_active')->default(false);
            $table->unsignedInteger('revision')->default(1);
            $table->timestamp('tested_at')->nullable();
            $table->string('last_error')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'name']);
            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('llm_configurations');
    }
};
