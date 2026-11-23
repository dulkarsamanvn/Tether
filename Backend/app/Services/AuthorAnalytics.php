<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class AuthorAnalytics
{
    public function forAuthor(User $author, CarbonImmutable $start, CarbonImmutable $end, string $sort): array
    {
        $days = (int) $start->diffInDays($end) + 1;
        $previousStart = $start->subDays($days);
        $until = $end->addDay();
        // The same owned, currently published post scope is used for every metric.
        $published = $author->blogs()->where('status', 'published');
        $postIds = (clone $published)->select('blogs.id');
        $views = DB::table('blog_views')->whereIn('blog_id', clone $postIds)
            ->where(fn ($query) => $query->whereNull('user_id')->orWhere('user_id', '!=', $author->id));
        $likes = DB::table('blog_likes')->whereIn('blog_id', clone $postIds);
        $comments = DB::table('comments')->whereIn('blog_id', clone $postIds);
        $counts = [
            'views' => $this->dailyCounts($views, 'created_at', $previousStart, $until),
            'likes' => $this->dailyCounts($likes, 'created_at', $previousStart, $until),
            'comments' => $this->dailyCounts($comments, 'created_at', $previousStart, $until),
            'posts_published' => $this->dailyCounts((clone $published)->toBase(), 'published_at', $previousStart, $until),
        ];
        $summary = array_fill_keys(array_keys($counts), 0);
        $previous = $summary;
        $daily = [];
        for ($day = $previousStart; $day->lessThan($until); $day = $day->addDay()) {
            $date = $day->toDateString();
            $row = ['date' => $date];
            foreach ($counts as $metric => $values) {
                $value = (int) ($values[$date] ?? 0);
                if ($day->lessThan($start)) $previous[$metric] += $value;
                else { $summary[$metric] += $value; $row[$metric] = $value; }
            }
            if ($day->greaterThanOrEqualTo($start)) $daily[] = $row;
        }
        $library = $author->blogs()->select('status')->selectRaw('COUNT(*) AS total')->groupBy('status')->pluck('total', 'status');
        $posts = (clone $published)->select(['blogs.id', 'blogs.title', 'blogs.published_at'])->withCount([
            'blogViews as views' => fn ($query) => $query->where('created_at', '>=', $start)->where('created_at', '<', $until)
                ->where(fn ($readers) => $readers->whereNull('user_id')->orWhere('user_id', '!=', $author->id)),
            'likedBy as likes' => fn ($query) => $query->where('blog_likes.created_at', '>=', $start)->where('blog_likes.created_at', '<', $until),
            'comments' => fn ($query) => $query->where('created_at', '>=', $start)->where('created_at', '<', $until),
        ])->orderByDesc($sort === 'comments' ? 'comments_count' : $sort)->orderByDesc('published_at')->orderByDesc('id')->paginate(10)->withQueryString()
            ->through(fn ($post) => [
                'id' => $post->id, 'title' => $post->title, 'published_at' => $post->published_at?->toIso8601String(),
                'views' => (int) $post->views, 'likes' => (int) $post->likes, 'comments' => (int) $post->comments_count,
            ]);
        return [
            'range' => ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString(), 'days' => $days, 'timezone' => 'UTC'],
            'summary' => $summary,
            'comparison' => ['start_date' => $previousStart->toDateString(), 'end_date' => $start->subDay()->toDateString(), 'summary' => $previous],
            'library' => ['published_posts' => (int) ($library['published'] ?? 0), 'draft_posts' => (int) ($library['draft'] ?? 0), 'scheduled_posts' => (int) ($library['scheduled'] ?? 0)],
            'daily' => $daily,
            'posts' => $posts->toArray(),
        ];
    }

    private function dailyCounts(Builder $query, string $column, CarbonImmutable $start, CarbonImmutable $until): array
    {
        // Column names are internal constants; dates are bound parameters. DATE works
        // on the project's MySQL database and on SQLite used by the test suite.
        return $query->where($column, '>=', $start)->where($column, '<', $until)
            ->selectRaw("DATE({$column}) AS activity_date, COUNT(*) AS total")
            ->groupByRaw("DATE({$column})")->orderBy('activity_date')->pluck('total', 'activity_date')->all();
    }
}
