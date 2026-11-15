<?php

namespace App\Console\Commands;

use App\Models\Blog;
use Illuminate\Console\Command;

class PublishScheduledBlogs extends Command
{
    protected $signature = 'blogs:publish-scheduled';

    protected $description = 'Publish scheduled blog posts whose publication time has arrived';

    public function handle(): int
    {
        $now = now()->utc();

        // One conditional update makes retries safe and excludes posts in Trash.
        $count = Blog::where('status', 'scheduled')
            ->where('scheduled_at', '<=', $now)
            ->update([
                'status' => 'published',
                'published_at' => $now,
                'scheduled_at' => null,
                'scheduled_timezone' => null,
            ]);

        $this->info("Published {$count} scheduled blog(s).");

        return self::SUCCESS;
    }
}
