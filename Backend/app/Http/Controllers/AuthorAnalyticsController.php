<?php

namespace App\Http\Controllers;

use App\Services\AuthorAnalytics;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthorAnalyticsController extends Controller
{
    public function index(Request $request, AuthorAnalytics $analytics): JsonResponse
    {
        abort_unless($request->user()->is_active, 403);
        $input = $request->validate([
            'start_date' => ['required_with:end_date', 'date_format:Y-m-d'],
            'end_date' => ['required_with:start_date', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'sort' => ['sometimes', Rule::in(['views', 'likes', 'comments'])],
            'page' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
        ]);
        $today = CarbonImmutable::today('UTC');
        $start = isset($input['start_date']) ? CarbonImmutable::createFromFormat('!Y-m-d', $input['start_date'], 'UTC') : $today->subDays(29);
        $end = isset($input['end_date']) ? CarbonImmutable::createFromFormat('!Y-m-d', $input['end_date'], 'UTC') : $today;
        if ($end->greaterThan($today)) {
            throw ValidationException::withMessages(['end_date' => 'Choose an end date on or before today (UTC).']);
        }
        if ($start->diffInDays($end) >= 366) {
            throw ValidationException::withMessages(['end_date' => 'Choose a date range of 366 days or fewer.']);
        }
        return response()->json($analytics->forAuthor($request->user(), $start, $end, $input['sort'] ?? 'views'))
            ->header('Cache-Control', 'private, no-store');
    }
}
