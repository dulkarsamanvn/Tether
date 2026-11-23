<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuthorController;
use App\Http\Controllers\AuthorAnalyticsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\EditorialSuggestionController;
use App\Http\Controllers\LlmConfigurationController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\BookmarkController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\TagController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


// Public routes: no login required
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/authors', [AuthorController::class, 'index']);
Route::get('/authors/{id}', [AuthorController::class, 'show'])->whereNumber('id');
Route::get('/authors/{id}/blogs', [AuthorController::class, 'blogs'])->whereNumber('id');
Route::get('/authors/{id}/followers', [AuthorController::class, 'followers'])->whereNumber('id');
Route::get('/authors/{id}/following', [AuthorController::class, 'following'])->whereNumber('id');

//blog routes
Route::get('/blogs', [BlogController::class, 'index']);
Route::get('/blogs/{id}', [BlogController::class, 'show']);
//comment routes
Route::get('/blogs/{id}/comments', [CommentController::class, 'index']);
//category & tag routes
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/tags', [TagController::class, 'index']);

// Protected routes: login required
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/author/analytics', [AuthorAnalyticsController::class, 'index']);
    Route::get('/llm-configurations', [LlmConfigurationController::class, 'index']);
    Route::get('/llm-configurations/active', [LlmConfigurationController::class, 'active']);
    Route::post('/llm-configurations/models', [LlmConfigurationController::class, 'models'])->middleware('throttle:llm-models');
    Route::post('/llm-configurations', [LlmConfigurationController::class, 'store']);
    Route::put('/llm-configurations/{id}', [LlmConfigurationController::class, 'update'])->whereNumber('id');
    Route::post('/llm-configurations/{id}/connect', [LlmConfigurationController::class, 'connect'])->whereNumber('id')->middleware('throttle:llm-connections');
    Route::post('/llm-configurations/{id}/disconnect', [LlmConfigurationController::class, 'disconnect'])->whereNumber('id');
    Route::delete('/llm-configurations/{id}', [LlmConfigurationController::class, 'destroy'])->whereNumber('id');
    Route::post('/editor/suggestions', [EditorialSuggestionController::class, 'store'])->middleware('throttle:editor-suggestions');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/authors/{id}/follow', [FollowController::class, 'store'])->whereNumber('id');
    Route::delete('/authors/{id}/follow', [FollowController::class, 'destroy'])->whereNumber('id');
    Route::get('/following', [FollowController::class, 'index']);
    Route::get('/following/feed', [FollowController::class, 'feed']);

    //blog routes
    Route::post('/blogs', [BlogController::class, 'store']);
    Route::put('/blogs/{id}', [BlogController::class, 'update']);
    Route::delete('/blogs/{id}', [BlogController::class, 'destroy']);
    Route::put('/blogs/{id}/restore', [BlogController::class, 'restore']);
    Route::delete('/blogs/{id}/schedule', [BlogController::class, 'cancelSchedule']);
    //blogs of logged in user
    Route::get('/my-blogs',      [BlogController::class, 'myBlogs']);
    Route::get('/my-blogs/trash', [BlogController::class, 'trash']);
    Route::get('/my-blogs/{id}', [BlogController::class, 'myBlog']);
    // Private saved blogs
    Route::get('/bookmarks', [BookmarkController::class, 'index']);
    Route::put('/blogs/{id}/bookmark', [BookmarkController::class, 'store']);
    Route::delete('/blogs/{id}/bookmark', [BookmarkController::class, 'destroy']);
    // Blog likes
    Route::put('/blogs/{id}/like', [LikeController::class, 'store']);
    Route::delete('/blogs/{id}/like', [LikeController::class, 'destroy']);
    //comment routes
    Route::post('/blogs/{id}/comments', [CommentController::class, 'store']);
    Route::delete('/comments/{id}', [CommentController::class, 'destroy']);
    //category & tag routes
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::post('/tags', [TagController::class, 'store']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });
});
