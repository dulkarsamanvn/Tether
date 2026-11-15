# Tether CMS

A blog management system with a **Laravel** API backend and a **React** frontend.

## Features

- User registration, login and logout (token login with Laravel Sanctum)
- Create, edit, delete and view blogs 
- Featured image upload
- Comments on blogs
- Share blogs via copy link, Twitter / X, LinkedIn and WhatsApp
- Save published blogs to a private, paginated "Saved Blogs" reading list
- Like or unlike published blogs, with like counts on posts and blog cards
- App-wide font picker with 10 fonts, Poppins by default, and a saved browser preference
- "My Blogs" dashboard for each user
- Private, paginated Trash with restoration of deleted blog posts
- Browser autosave and draft recovery, including selected cover images
- Scheduled publishing with timezone selection, rescheduling, and cancellation
- Author profiles with editable names, bios, profile photos, and public article lists

### Author profiles

Open **My Profile** to update your display name, bio, and profile photo. Photos
accept JPG, PNG, or WebP files up to 2 MB and can be replaced or removed. Profile
changes update the sidebar immediately. Run `php artisan migrate` from `Backend`
for the profile fields, and ensure `php artisan storage:link` has been run for photos.

Click an author's name on a post or article card to open their public profile.
Public profiles show only published, non-deleted posts; drafts and scheduled
posts stay private. Email addresses and account settings are excluded from
public profile and article-author responses.

Public APIs: `GET /api/authors/{id}` and `GET /api/authors/{id}/blogs` (paginated).
Authenticated APIs: `GET /api/profile` and `PUT /api/profile`; updates always apply
to the authenticated account. Photo uploads use multipart POST with `_method=PUT`.

### Scheduled publishing

Run the new migration from `Backend`:

```bash
php artisan migrate
```

In the editor, complete the post, choose a future **Publication date and time**
and **Timezone**, then select **Schedule post**. The post stays private and
appears in **My Blogs → Scheduled** until publication. Times are stored in UTC;
the chosen timezone is retained for editing and display.

Reopen the post to **Update schedule**, **Cancel schedule** (returning it to
Draft), or **Publish now**. Autosave and **Save Draft** keep unfinished edits
separate; select **Update schedule** to apply those edits to the version that
will publish. Already published posts keep their existing private-draft workflow.

In a separate terminal, run the scheduler from `Backend` during development:

```bash
php artisan schedule:work
```

Keep that terminal running. `php artisan serve` and the queue worker do not
start the scheduler. The `blogs:publish-scheduled` command runs every minute
without overlapping. It publishes due posts in one conditional database update,
skips posts in Trash, and can safely run again after downtime. Publication occurs
on the next scheduler check, usually within a minute of the selected time.

On a Linux production server, install this cron entry with the real backend path:

```cron
* * * * * cd /path/to/Backend && php artisan schedule:run >> /dev/null 2>&1
```

For a one-off run or to inspect the registered task, use:

```bash
php artisan blogs:publish-scheduled
php artisan schedule:list
```

The existing blog create/update endpoints accept `status: scheduled`, a future
`scheduled_at` timestamp with a timezone offset, and an optional IANA
`scheduled_timezone` (default UTC). The author-only
`DELETE /api/blogs/{id}/schedule` cancels a schedule without changing its content.
Cancellation cannot unpublish a post that has already gone live.

### Autosave and draft recovery

The editor saves unfinished writing in this browser after one second without
changes, with a checkpoint every ten seconds during continuous typing. It keeps
the title, rich text, cover image, excerpt, categories, tags,
and settings, even before a title or complete article has been entered. The
editor shows saving progress and the last saved time. Return to **Write** or
reopen the same post to recover or discard a saved copy. Accounts and editor
sessions have separate recovery copies.

Autosave and **Save Draft** on an already published post keep the edits private;
the published version changes only when **Publish changes** is selected.
**Save Draft** on a new or unpublished post still saves it to **My Blogs**.
Successful server saves clear that editor session's recovery copy. Failed saves
keep it for retrying. The browser warns before closing or refreshing while
changes are still waiting to be saved. Dashboard navigation first finishes a
pending save; if storage fails, the editor offers retry, stay, or leave options.

Recovery copies are stored on this device, without a fixed expiry; they do not
sync between browsers. Clearing browser site data removes them. Keep this
browser profile private on shared devices. No database migration is required.

### Trash and restore

In **My Blogs**, choose **Move to Trash** to hide a post from readers. Open
**Trash** from the sidebar or My Blogs and choose **Restore** to recover it.
Only the author can list or restore their deleted posts. Posts stay in Trash
until restored; there is no automatic expiry.

Restoration preserves the original content, featured image, categories, tags,
comments, likes, bookmarks, view count, and publication date. Published posts
become public again immediately; drafts remain private. Restoring a scheduled
post resumes a future schedule. If its scheduled time has already passed, it
returns as a draft so the author can review and reschedule it.

The authenticated API provides `GET /api/my-blogs/trash` (paginated) and
`PUT /api/blogs/{id}/restore`. The existing `DELETE /api/blogs/{id}` moves a post
to Trash. No additional database migration is required.

### Coming Soon

- More features will be added over time

## Tech Stack

- **Backend:** PHP, Laravel, Laravel Sanctum, PostgreSQL
- **Frontend:** React (Vite), React Router, Axios

## Project Structure

```
Tether-CMS/
├── Backend/     Laravel API
└── Frontend/    React app
```

## Getting Started

### Requirements

- PHP 8.2 or higher
- Composer
- Node.js and npm
- A database (MySQL or PostgreSQL)

### 1. Backend setup

```bash
cd Backend
composer install
cp .env.example .env
php artisan key:generate
```

Open `.env` and set your database details:

```
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
APP_URL=http://127.0.0.1:8000
```

Then run:

```bash
php artisan migrate
php artisan db:seed --class=CategorySeeder
php artisan storage:link
php artisan serve
```

The API runs at `http://127.0.0.1:8000`.

To add five published sample blogs for every existing user, run from `Backend`:

```bash
php artisan db:seed --class=SampleBlogSeeder
```

This creates no accounts and preserves existing posts. Re-running it skips samples
already created, including edited or soft-deleted samples. Matching existing
categories are attached automatically.

### 2. Frontend setup

```bash
cd Frontend
npm install
```

Create a file named `.env` inside the `Frontend` folder:

```
VITE_API_URL=http://127.0.0.1:8000/api
```

Then start the app:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

> CORS: the Laravel file `config/cors.php` must list `http://localhost:5173` in `allowed_origins`.

## Author

Dulkar Saman VN
