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
