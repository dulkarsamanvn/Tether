import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'
import AnalyticsChart from '../../components/ui/AnalyticsChart'
import { AuthorAnalyticsSkeleton } from '../../components/ui/LoadingSkeletons'
import { analyticsChange, analyticsDate, analyticsRange, validateAnalyticsRange } from '../../utils/analytics'

const buttonClass = 'rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300'
const inputClass = 'w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bordo focus:ring-2 focus:ring-bordo/15 [color-scheme:light] dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[color-scheme:dark]'
const metrics = [{ id: 'views', label: 'Views', hint: 'Recorded reader visits' }, { id: 'likes', label: 'Likes', hint: 'Likes still on your posts' }, { id: 'comments', label: 'Comments', hint: 'Comments still on your posts' }, { id: 'posts_published', label: 'Posts published', hint: 'Published in this period' }]

export default function AuthorAnalytics() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AnalyticsSession key={user.id} />
}

function AnalyticsSession() {
  const [range, setRange] = useState(() => analyticsRange())
  const [sort, setSort] = useState('views')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((value) => value + 1)

  return <div className="mx-auto min-w-0 max-w-6xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Author Analytics</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">See how readers engage with your published posts.</p></div>
      <div className="flex gap-2"><Link to="/dashboard/blogs" className={buttonClass}>My Blogs</Link><button type="button" onClick={refresh} className={buttonClass}>Refresh</button></div>
    </div>
    <DateFilters range={range} onChange={(next) => { setRange(next); setPage(1) }} />
    <AnalyticsReport key={`${range.start_date}:${range.end_date}:${sort}:${page}:${version}`} range={range} sort={sort} page={page} onSort={(next) => { setSort(next); setPage(1) }} onPageChange={setPage} onRefresh={refresh} />
  </div>
}

function DateFilters({ range, onChange }) {
  const [draft, setDraft] = useState(range)
  const [error, setError] = useState(null)
  const today = analyticsRange(1).end_date

  return <section aria-label="Analytics date filters" className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Date range presets" className="flex flex-wrap gap-2">{[7, 30, 90].map((days) => {
        const preset = analyticsRange(days)
        const selected = range.start_date === preset.start_date && range.end_date === preset.end_date
        return <button key={days} type="button" aria-pressed={selected} onClick={() => { setDraft(preset); setError(null); onChange(preset) }} className={`rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-bordo ${selected ? 'bg-bordo text-green' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}>Last {days} days</button>
      })}</div>
      <p className="text-xs text-gray-500 dark:text-gray-400">All dates and daily totals use UTC.</p>
    </div>
    <form aria-label="Custom analytics dates" onSubmit={(event) => { event.preventDefault(); const message = validateAnalyticsRange(draft.start_date, draft.end_date, today); setError(message); if (!message) onChange(draft) }}>
      <div className="grid min-w-0 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0"><label htmlFor="analytics-start" className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Start date</label><input id="analytics-start" type="date" value={draft.start_date} required max={today} onChange={(event) => { setDraft((previous) => ({ ...previous, start_date: event.target.value })); setError(null) }} className={inputClass} /></div>
        <div className="min-w-0"><label htmlFor="analytics-end" className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">End date</label><input id="analytics-end" type="date" value={draft.end_date} required max={today} onChange={(event) => { setDraft((previous) => ({ ...previous, end_date: event.target.value })); setError(null) }} className={inputClass} /></div>
        <button type="submit" className="rounded-xl bg-bordo px-5 py-2.5 text-sm font-bold text-green focus-visible:outline-bordo">Apply dates</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
    </form>
  </section>
}

function AnalyticsReport({ range, sort, page, onSort, onPageChange, onRefresh }) {
  const [result, setResult] = useState(null)
  const [metric, setMetric] = useState('views')
  useEffect(() => {
    const controller = new AbortController()
    api.get('/author/analytics', { params: { ...range, sort, page }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        if (page > data.posts.last_page) { onPageChange(Math.max(1, data.posts.last_page)); return }
        setResult({ data })
      })
      .catch((failure) => {
        if (controller.signal.aborted) return
        const response = failure.response?.data
        setResult({ error: response?.errors ? Object.values(response.errors).flat().join(' ') : failure.response?.status === 403 ? 'Analytics are unavailable for this account.' : 'Could not load your analytics. Please try again.' })
      })
    return () => controller.abort()
  }, [range, sort, page, onPageChange])

  if (!result) return <AuthorAnalyticsSkeleton />
  if (result.error) return <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900"><p role="alert" className="mb-4 text-sm text-red-500">{result.error}</p><button type="button" onClick={onRefresh} className={buttonClass}>Try again</button></div>
  const { data } = result
  const selected = metrics.find((item) => item.id === metric)
  return <div>
    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{analyticsDate(data.range.start_date)} – {analyticsDate(data.range.end_date)} <span className="text-gray-400">· Compared with the previous {data.range.days} {data.range.days === 1 ? 'day' : 'days'}</span></p>
    <div aria-label="Analytics totals" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-5">
      {metrics.map((item) => {
        const change = analyticsChange(data.summary[item.id], data.comparison.summary[item.id])
        return <section key={item.id} aria-label={`${item.label} total`} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{item.label}</h2>
          <p className="mt-2 break-words text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">{data.summary[item.id].toLocaleString()}</p>
          <p className={`mt-2 text-xs font-semibold ${change.direction === 'up' ? 'text-emerald-700 dark:text-emerald-400' : change.direction === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`}>{change.text}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">{item.hint}</p>
        </section>
      })}
    </div>
    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Your library: <span className="font-semibold text-gray-700 dark:text-gray-300">{data.library.published_posts}</span> published · <span className="font-semibold text-gray-700 dark:text-gray-300">{data.library.draft_posts}</span> drafts · <span className="font-semibold text-gray-700 dark:text-gray-300">{data.library.scheduled_posts}</span> scheduled</p>
    {data.library.published_posts === 0 ? <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">No published posts yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">Publish your first post to start seeing reader activity here.</p><Link to="/dashboard/write" className="mt-5 inline-block rounded-xl bg-bordo px-5 py-2.5 text-sm font-bold text-green">Write a post</Link>
    </div> : <>
      <section aria-labelledby="daily-activity-heading" className="mb-6 min-w-0 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 id="daily-activity-heading" className="text-lg font-bold text-gray-900 dark:text-white">Daily activity</h2><div role="group" aria-label="Chart metric" className="flex flex-wrap gap-1">{metrics.map((item) => <button key={item.id} type="button" aria-pressed={metric === item.id} onClick={() => setMetric(item.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-bordo ${metric === item.id ? 'bg-bordo/15 text-gray-900 dark:text-bordo' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>{item.label}</button>)}</div></div>
        <AnalyticsChart key={metric} daily={data.daily} metric={metric} label={selected.label} />
        <details className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800"><summary className="cursor-pointer rounded text-sm font-semibold text-gray-500 focus-visible:outline-bordo dark:text-gray-400">View daily data</summary><div className="relative mt-4 max-h-80 overflow-auto rounded-xl border border-gray-100 dark:border-gray-800"><table className="w-full min-w-[560px] text-left text-sm"><caption className="sr-only">Daily analytics in UTC</caption><thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"><tr>{['Date (UTC)', ...metrics.map((item) => item.label)].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{data.daily.map((day) => <tr key={day.date} className="border-t border-gray-100 text-gray-600 dark:border-gray-800 dark:text-gray-300"><th scope="row" className="whitespace-nowrap px-4 py-3 font-medium">{analyticsDate(day.date)}</th>{metrics.map((item) => <td key={item.id} className="px-4 py-3 tabular-nums">{day[item.id].toLocaleString()}</td>)}</tr>)}</tbody></table></div></details>
      </section>
      <section aria-labelledby="post-performance-heading" className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 id="post-performance-heading" className="text-lg font-bold text-gray-900 dark:text-white">Post performance</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ranked by {sort} in the selected date range.</p></div><div role="group" aria-label="Rank posts by" className="flex flex-wrap gap-1">{metrics.slice(0, 3).map((item) => <button key={item.id} type="button" aria-pressed={sort === item.id} onClick={() => onSort(item.id)} className={`rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-bordo ${sort === item.id ? 'bg-bordo text-green' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>{item.label}</button>)}</div></div>
        <div className="relative overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><caption className="sr-only">Performance of your published posts in the selected date range</caption><thead className="border-y border-gray-100 bg-gray-50 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400"><tr>{['Post', 'Published (UTC)', 'Views', 'Likes', 'Comments'].map((heading) => <th key={heading} scope="col" className="px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{data.posts.data.map((post) => <tr key={post.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800"><th scope="row" className="max-w-sm px-5 py-4 font-semibold"><Link to={`/dashboard/blogs/${post.id}/view`} className="line-clamp-2 text-gray-900 hover:text-bordo focus-visible:outline-bordo dark:text-white">{post.title}</Link></th><td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500 dark:text-gray-400">{post.published_at ? analyticsDate(post.published_at.slice(0, 10)) : '—'}</td>{metrics.slice(0, 3).map((item) => <td key={item.id} className={`px-5 py-4 tabular-nums ${sort === item.id ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{post[item.id].toLocaleString()}</td>)}</tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"><p>{data.posts.total} published {data.posts.total === 1 ? 'post' : 'posts'}</p>{data.posts.last_page > 1 && <nav aria-label="Analytics post pagination" className="flex items-center gap-3"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>Previous</button><span>{page} / {data.posts.last_page}</span><button type="button" disabled={page >= data.posts.last_page} onClick={() => onPageChange(page + 1)} className={buttonClass}>Next</button></nav>}</div>
      </section>
    </>}
    <details className="mt-6 text-sm text-gray-500 dark:text-gray-400"><summary className="cursor-pointer rounded font-semibold focus-visible:outline-bordo">How counts work</summary><div className="mt-3 max-w-3xl space-y-2 leading-relaxed"><p>Analytics cover your currently published posts. Drafts, scheduled posts, and posts in Trash do not contribute to activity totals.</p><p>A view records a reader's first visit to each post. Reloads and your own visits are not counted. One reader visiting two posts can contribute two views.</p><p>Likes and comments are grouped by the date they were added. Removed likes and deleted comments no longer appear in these totals.</p><p>The comparison period is {analyticsDate(data.comparison.start_date)} – {analyticsDate(data.comparison.end_date)}. Dates use UTC.</p></div></details>
  </div>
}
