# Tether CMS

A blog management system with a **Laravel** API backend and a **React** frontend.

## Features

- User registration, login and logout (token login with Laravel Sanctum)
- Email password recovery with expiring, single-use links and queued delivery
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
- Follow/unfollow authors, public follower counts, and a private following feed
- Author discovery with name/bio search, sorting, and follow controls
- AI title and excerpt suggestions with individual review and apply controls
- Private LLM agent configuration with encrypted keys and connection testing
- Private author analytics with date filters, daily activity, previous-period comparisons, and post rankings

### Password recovery

Choose **Forgot password?** on the sign-in page to request a link. The recovery
form shows a generic inbox notice and a resend countdown. Open the emailed link
to choose and confirm a new password; the reset page handles missing, expired,
and already-used links with an option to request another one. After success,
the browser returns to sign-in with confirmation. Reset credentials and passwords
are never saved to local or session storage. If this browser is signed in to the
account being reset, its local sign-in is cleared; another account is preserved.

`POST /api/forgot-password` accepts an email and returns the same generic response
for active, unknown, inactive, and recently requested accounts. Requests have IP
and email-based limits, including a 60-second resend cooldown. Reset tokens are
hashed in the existing `password_reset_tokens` table and expire after 60 minutes.
`POST /api/reset-password` accepts `email`, `token`, `password`, and
`password_confirmation`. A successful reset consumes the link, rotates the
remember token, revokes all Sanctum tokens and database sessions for that user,
and requires a fresh login. Passwords must contain at least 8 characters and fit
within bcrypt's 72-byte limit.

Set `FRONTEND_URL` in `Backend/.env` to the trusted React application URL
(development default: `http://localhost:5173`). Reset links use URL fragments so
the token and email are not sent to the frontend web server. Do not build this
URL from request headers. In production, use HTTPS and serve the React fallback
for `/reset-password`.

Configure `MAIL_MAILER=smtp`, your provider's `MAIL_HOST`, `MAIL_PORT`,
`MAIL_USERNAME`, `MAIL_PASSWORD`, and verified `MAIL_FROM_ADDRESS` in the backend
environment. Match `MAIL_SCHEME` to the provider. The example `log` mailer is only
for local development: it writes email content, including reset links, to local
logs and does not send email. Keep mail credentials and reset links private.

Run `php artisan migrate` if the standard reset-token, session, and queue tables
have not been created. Emails use encrypted jobs on the `password-resets` queue,
dispatched after the token transaction commits. Start a worker from `Backend`:

```sh
php artisan queue:work database --queue=password-resets,default --tries=3 --timeout=30
```

`PASSWORD_RESET_QUEUE_CONNECTION` defaults to `database`, independently of the
default queue connection. When using another asynchronous queue connection,
update that variable and the worker command together. Jobs retry transient mail
failures and skip links that have expired, been used, or been replaced. Monitor
`php artisan queue:failed` and backend logs for delivery failures, and restart
workers after deployment. Run `php artisan auth:clear-resets` periodically to
remove expired token records. Automated tests fake delivery and never send mail.

### Author analytics

Open **Analytics** in the sidebar for totals, daily charts, and post performance.
Choose the last 7, 30, or 90 days, or apply custom dates. Switch the chart between
views, likes, comments, and published posts; explore days with the pointer or
keyboard, or expand the daily data table. Post rankings can be sorted by views,
likes, or comments. Empty states, loading skeletons, and retry controls are included.

Authenticated, active authors can read `GET /api/author/analytics`. Optional
`start_date` and `end_date` must be supplied together as `YYYY-MM-DD` UTC dates.
The default is the last 30 days, including today; custom ranges can cover up to
366 days and cannot end in the future. `sort` accepts `views`, `likes`, or
`comments`; ranked posts are paginated 10 at a time using `page`.

The response includes period totals, an equal-length previous-period comparison,
zero-filled daily activity, current published/draft/scheduled library counts,
and ranked posts. All analytics are scoped to the signed-in author's currently
published, non-trashed posts. No reader identities or IP addresses are returned.
Views use the existing first-view records (one reader per post), exclude the
author's own visits, and are not page-reload counts. Period counts use the event
creation date; old posts can receive activity in a recent date range. Removed
likes and deleted comments no longer contribute to historical totals. Existing
`view_count` counters are not used to invent dated events.

Run `php artisan migrate` from `Backend` to add the analytics query indexes.

### LLM Configuration

Open **LLM Configuration** in the sidebar to manage your own writing agents.
Each agent has a name, provider (**OpenAI**, **Google Gemini**, **Anthropic Claude**,
or **Grok (xAI)**), model ID, API key, and optional writing-style instructions.

1. Run `php artisan migrate` from `Backend` to create the configurations table.
2. Choose **Add agent**, select a provider, and enter its API key. Use **Fetch models**
   to search available model names and IDs, or enter a model ID manually, then
   **Save agent**. Editing an agent can fetch models using its saved key.
3. Choose **Connect**. This makes a short sample generation request to verify
   credentials, model access, and the required JSON output. It may use API credits.
4. A successful connection selects that agent for the editor. Connecting another
   saved agent switches the selection. A failed new connection keeps the previous
   working agent selected.
5. Open the editor and choose **Suggest with AI** to use the connected model.

You can edit agents, keep an existing key by leaving its replacement field blank,
disconnect without deleting settings, or delete an agent after confirmation.
Changing a provider requires a new key. Provider, model, or key changes require
reconnection. Each account can save up to 10 agents and select one at a time.
Changing the provider or entered key clears fetched choices and cancels an
outstanding lookup. Fetch errors leave manual entry available. Model lookup does
not select a model automatically or verify generation; use Connect after saving.

Keys are encrypted in the database using Laravel's `APP_KEY`, are hidden from
JSON responses, and are never sent back to the browser or stored in browser
storage by this feature. Keep the application key with your database backups;
unreadable encrypted keys must be entered again. Configuration APIs are scoped
to the authenticated account. Provider URLs are fixed, not user-supplied.
Environment-level `OPENAI_API_KEY` settings are no longer used by suggestions.

Authenticated APIs: `GET/POST /api/llm-configurations`,
`GET /api/llm-configurations/active`, `PUT/DELETE /api/llm-configurations/{id}`,
and `POST /api/llm-configurations/{id}/connect` or `/disconnect`. Connection
tests are limited to 5 per minute and 20 per day per account. Active-agent
responses expose the agent ID and revision so the editor can detect changes
before sending draft text to a different provider or model.

`POST /api/llm-configurations/models` lists models using a `provider` and either
an entered `api_key` or an owned `configuration_id` with the same provider.
An entered key overrides the saved key for this lookup only. Fetching never
saves a key, changes the active agent, or marks a connection as verified.
Gemini results include models supporting `generateContent`; Grok uses its
language-model catalog. OpenAI's catalog can include models unsuitable for
suggestions, so Connect still verifies actual structured generation.
Paginated catalogs are bounded to 5 pages, 1,000 choices, and a 25-second
request budget; partial lists have `truncated: true`. Model lookup is limited
to 10 requests per minute and 100 per day per account, separately from connection
tests. Keys travel in provider headers, not URLs, and model responses use `no-store`.

Connection tests, suggestions, and model lookup return safe errors that distinguish
invalid credentials (`ai_auth_error`), permissions (`ai_permission_error`),
unavailable models (`ai_model_error`), billing (`ai_billing_error`), usage quotas
(`ai_quota_error`), and short-term rate limits (`ai_rate_limit`). Providers do not
always distinguish these causes; ambiguous Gemini resource-exhaustion responses
ask the user to check project quotas. Raw provider errors are never returned.

Provider references: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[Gemini structured outputs](https://aistudio.google.com/docs/structured-output?generate-content=true),
[Claude structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs),
and [Grok structured outputs](https://docs.x.ai/developers/model-capabilities/text/structured-outputs).

For Grok, choose **Grok (xAI)**, use the suggested `grok-4.7` model ID (or another
compatible model available to your account), and enter an xAI API key. The
backend uses `https://api.x.ai/v1/responses`, requests structured JSON with low
reasoning effort, and sets `store: false`. Reasoning blocks are ignored; only
the validated title and excerpt suggestions are returned to the editor.

### AI title and excerpt suggestions

In the blog editor, write at least 80 characters and choose **Suggest with AI**.
Laravel sends the current title and draft's plain text to your connected agent
and validates three title options (up to 120 characters each) and one excerpt
(up to 300 characters). The model is asked to use the draft's language and avoid
invented claims. Review each result and use **Use title** or **Use excerpt** to
replace that field. Applied changes enter the existing autosave/recovery flow;
generation itself never saves, changes status, schedules, or publishes a post.

The editor shows the connected agent and provider, with **Change agent** linking
to configuration. If no agent is connected, choose **Configure an LLM**. Writing
and autosave keep working. Provider access and API credits are managed with your
provider account. This feature needs no new dependencies.

Authenticated API: `POST /api/editor/suggestions` with optional `title` and
required plain-text `content` (80-20,000 characters), with optional paired
`configuration_id` and `configuration_revision` to verify the selected agent
before any provider request. Limits are 5 requests per minute and 50 per day per
account, using Laravel's cache. The editor sends only
the first 20,000 characters for longer drafts and shows that limit. Requests run
on demand with a 30-second backend timeout and no automatic retries. No queue
worker or scheduler is needed for this interactive feature.

Suggestions are not automatically applied. Editing the draft text or changing
the connected agent makes existing suggestions stale and disables their apply
buttons until regenerated. Authors
can cancel a pending request; late responses cannot overwrite a newer result.
OpenAI and Grok requests use `store: false`; provider data policies still apply to each
service, and this feature does not claim zero provider retention. Drafts,
credentials, and raw provider errors are not logged by this feature. Tests use fake HTTP responses,
including refusals, invalid output, outages, timeouts, and per-account limits.

API references: [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
and [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

### Discovering authors

Choose **Discover authors** on Home, a profile's follower/following lists, or your
following feed. The directory at `/dashboard/authors` shows active authors with
at least one published, non-deleted post. Search names and bios, and sort by
**Most followed**, **Most posts**, or **Newest authors**. Search and sort apply
across the entire directory; pagination shows 12 authors per page. Filters and
the current page stay in the URL for sharing and browser navigation.

Cards link to public profiles and followers, with follow/unfollow controls for
signed-in readers. Unfollowing asks for confirmation; guests can browse and sign
in to follow. Signed-in readers see other authors; their own profile is excluded
before search, sorting, and pagination. Guests see the full public directory.
Follow changes update the card's
follower count immediately; use **Refresh** to update the ranking.

Public API: `GET /api/authors?q=design&sort=followers&page=1`. Supported sorts are
`followers` (default), `posts`, and `newest`; `q` searches names/bios only and is
limited to 100 characters. Responses contain public profile fields, active
follower/following counts, published post counts, and the viewer's follow state.
Inactive accounts and private posts are excluded. No new migration is needed.

### Following authors

Open an author's profile and select **Follow**. Select **Following** on that
profile to unfollow. Profiles display follower and following counts. Sign-in is
required to follow, and users cannot follow themselves.

Following and followers are accessed from profile counts instead of the sidebar.
Choose **View following feed** from your own list to see the latest published
posts from followed authors, with an **Authors you follow** view for managing
follows. Unfollowing from this view asks for confirmation before removing the
author. The feed and author list belong to the signed-in account. Drafts,
scheduled posts, deleted posts, and inactive authors are excluded. Previously scheduled posts appear
automatically once published. Run `php artisan migrate` for the follows table.

Authenticated APIs: `PUT /api/authors/{id}/follow`,
`DELETE /api/authors/{id}/follow`, `GET /api/following`, and
`GET /api/following/feed`. Follow/unfollow are idempotent; list endpoints are
paginated. Public profiles include counts and the current viewer's follow state.

Click **followers** or **following** on any public profile to open its paginated
list. Lists include active accounts and public profile details only; email,
account settings, and relationship metadata are excluded. Follow controls reflect
the signed-in viewer's own relationships, and unfollowing asks for confirmation.
Your own lists also provide **View following feed** for reading followed authors'
posts. Public list APIs: `GET /api/authors/{id}/followers` and
`GET /api/authors/{id}/following`.

### Author profiles

Open **My Profile** in the header to see your public profile, including your
published posts and follower counts. Choose **Edit profile** to update your
display name, bio, and profile photo. **View public profile** returns to the
read-only author page. Profile editing has its own `/dashboard/profile/edit`
route; `/dashboard/profile` shows your public profile. Photos
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
