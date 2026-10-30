<?php

namespace Database\Seeders;

use App\Models\Blog;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SampleBlogSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::orderBy('id')->get();
        if ($users->isEmpty()) {
            $this->command?->warn('No users found. Create an account before seeding sample blogs.');

            return;
        }

        $posts = [
            [
                'title' => 'Getting started with Laravel',
                'category' => 'technology',
                'excerpt' => 'A practical approach to building a small application with clear routes, models, and controllers.',
                'content' => '<h2>Start with one useful feature</h2><p>Choose a small problem and define what a successful result looks like. A focused first version is easier to build and improve.</p><h2>Give each part a clear job</h2><p>Use routes to describe endpoints, controllers to handle requests, and models to work with stored data. Keep these responsibilities easy to follow.</p><h2>Check the complete flow</h2><ul><li>Validate incoming data.</li><li>Handle missing records clearly.</li><li>Test the result from the reader\'s point of view.</li></ul>',
            ],
            [
                'title' => 'Building reusable React components',
                'category' => 'technology',
                'excerpt' => 'Keep interfaces consistent by turning repeated behavior into small, focused components.',
                'content' => '<h2>Notice what repeats</h2><p>Buttons, article cards, and form fields often share structure and behavior. Extract a component when the repetition has a clear purpose.</p><h2>Keep the inputs understandable</h2><p>Use descriptive props and sensible defaults. A reader should understand what a component does from its name and the values passed to it.</p><h2>Make every state useful</h2><ul><li>Show progress while a request is running.</li><li>Explain failures near the relevant action.</li><li>Support keyboard interaction and clear labels.</li></ul>',
            ],
            [
                'title' => 'Small design changes that improve readability',
                'category' => 'design',
                'excerpt' => 'Spacing, typography, and contrast can make an article much more comfortable to read.',
                'content' => '<h2>Give the text room</h2><p>Use comfortable line spacing and a readable content width. Short paragraphs help readers follow an argument without losing their place.</p><h2>Use headings with a purpose</h2><p>A heading should tell the reader what comes next. Keep the hierarchy consistent so the article remains easy to scan.</p><h2>Review the details</h2><ul><li>Check contrast in both light and dark themes.</li><li>Test the layout on a narrow screen.</li><li>Keep links and interactive controls easy to recognize.</li></ul>',
            ],
            [
                'title' => 'Creating a writing routine that lasts',
                'category' => 'lifestyle',
                'excerpt' => 'A manageable routine can help turn ideas into finished articles without making writing feel overwhelming.',
                'content' => '<h2>Capture ideas early</h2><p>Keep a short list of questions, observations, and useful experiences. A few specific notes can become the starting point for an article.</p><h2>Separate drafting from editing</h2><p>Write a rough version before polishing every sentence. Once the main idea is on the page, review its structure and remove anything that distracts from it.</p><h2>Build a small habit</h2><ul><li>Choose a realistic writing window.</li><li>Focus on one idea at a time.</li><li>Finish with a clear next step for the next session.</li></ul>',
            ],
            [
                'title' => 'Learning more by building small projects',
                'category' => 'education',
                'excerpt' => 'Small projects connect new concepts to practical decisions and make progress easier to see.',
                'content' => '<h2>Choose a concrete outcome</h2><p>Build something you can use, such as a reading list or a simple note collection. A clear outcome gives each new concept a reason to exist.</p><h2>Add one capability at a time</h2><p>Complete a small feature, try it, and reflect on what you learned. Keep notes about the decisions that were confusing or surprising.</p><h2>Review the result</h2><ul><li>Explain the flow in your own words.</li><li>Try an empty state and an invalid input.</li><li>Improve one part before expanding the scope.</li></ul>',
            ],
        ];
        $categories = Category::all()->keyBy('slug');
        $rows = [];

        DB::transaction(function () use ($users, $posts, $categories, &$rows) {
            foreach ($users as $user) {
                $created = 0;

                foreach ($posts as $index => $post) {
                    // Stable identifiers preserve edited and soft-deleted samples on reruns.
                    $slug = "sample-user-{$user->id}-blog-".($index + 1);
                    $blog = Blog::withTrashed()->firstOrCreate(['slug' => $slug], [
                        'user_id' => $user->id,
                        'title' => $post['title'].' — '.$user->name,
                        'excerpt' => $post['excerpt'],
                        'content' => '<p>'.e($post['excerpt']).'</p>'.$post['content'],
                        'status' => 'published',
                        'published_at' => now()->subDays($index),
                        'meta_title' => $post['title'],
                        'meta_description' => $post['excerpt'],
                        'allow_comments' => true,
                    ]);

                    if ($blog->user_id !== $user->id) {
                        throw new RuntimeException("Sample slug {$slug} is already used by another author.");
                    }

                    if (! $blog->wasRecentlyCreated) {
                        continue;
                    }

                    if ($category = $categories->get($post['category'])) {
                        $blog->categories()->attach($category->id);
                    }
                    $created++;
                }

                $rows[] = [$user->id, $user->name, $user->email, $created, $user->blogs()->count()];
            }
        });

        $this->command?->table(['User ID', 'Name', 'Email', 'Blogs added', 'Total blogs'], $rows);
    }
}
