<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\TagController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


// Public routes: no login required
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

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
    Route::post('/logout', [AuthController::class, 'logout']);

    //blog routes
    Route::post('/blogs', [BlogController::class, 'store']);
    Route::put('/blogs/{id}', [BlogController::class, 'update']);
    Route::delete('/blogs/{id}', [BlogController::class, 'destroy']);
    //blogs of logged in user
    Route::get('/my-blogs',      [BlogController::class, 'myBlogs']);
    Route::get('/my-blogs/{id}', [BlogController::class, 'myBlog']);
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
