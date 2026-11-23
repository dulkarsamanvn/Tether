<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $emailKey = static function (Request $request): string {
            $email = $request->input('email');

            return hash('sha256', is_string($email) ? mb_strtolower(trim($email)) : '');
        };

        RateLimiter::for('password-links', fn (Request $request) => [
            Limit::perMinute(5)->by('password-links:ip:'.$request->ip()),
            Limit::perDay(20)->by('password-links:day:'.$request->ip()),
            Limit::perMinute(1)->by('password-links:email:'.$emailKey($request)),
        ]);
        RateLimiter::for('password-resets', fn (Request $request) => [
            Limit::perMinute(10)->by('password-resets:ip:'.$request->ip()),
            Limit::perMinute(5)->by('password-resets:email:'.$emailKey($request)),
        ]);

        RateLimiter::for('llm-models', fn (Request $request) => [
            Limit::perMinute(10)->by('llm-models:minute:'.$request->user()->id),
            Limit::perDay(100)->by('llm-models:day:'.$request->user()->id),
        ]);
        RateLimiter::for('llm-connections', fn (Request $request) => [
            Limit::perMinute(5)->by('llm-connect:minute:'.$request->user()->id),
            Limit::perDay(20)->by('llm-connect:day:'.$request->user()->id),
        ]);
        RateLimiter::for('editor-suggestions', fn (Request $request) => [
            Limit::perMinute(5)->by('editor-suggestions:minute:'.$request->user()->id),
            Limit::perDay(50)->by('editor-suggestions:day:'.$request->user()->id),
        ]);
    }
}
