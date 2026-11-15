import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../../api/api'
import Avatar from '../../components/ui/Avatar'
import BlogCard from '../../components/ui/BlogCard'
import FollowButton from '../../components/ui/FollowButton'
import { useAuth } from '../../hooks/useAuth'

const buttonClass = 'rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300'

export default function Following() {
  const { user, isAuthenticated } = useAuth()
  const [tab, setTab] = useState('posts')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <div className="mx-auto max-w-6xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Following</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Keep up with the authors you enjoy reading.</p></div>
      <Link to="/dashboard" className={buttonClass}>Discover posts</Link>
    </div>
    <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label="Following view">
      {[['posts', 'Latest posts'], ['authors', 'Authors you follow']].map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => { setTab(value); setPage(1) }} className={`rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-bordo ${tab === value ? 'bg-bordo text-green' : 'bg-gray-100 text-gray-500 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>{label}</button>)}
    </div>
    <FollowingPage key={`${user?.id}:${tab}:${page}:${version}`} tab={tab} page={page} onPageChange={setPage} onRefresh={() => setVersion((value) => value + 1)} />
  </div>
}

function FollowingPage({ tab, page, onPageChange, onRefresh }) {
  const [result, setResult] = useState(null)
  useEffect(() => {
    let cancelled = false
    api.get(tab === 'posts' ? '/following/feed' : '/following', { params: { page } })
      .then(({ data }) => {
        if (cancelled) return
        if (page > data.last_page) { onPageChange(Math.max(1, data.last_page)); return }
        setResult({ data })
      })
      .catch(() => { if (!cancelled) setResult({ error: 'Could not load your following list. Please try again.' }) })
    return () => { cancelled = true }
  }, [tab, page, onPageChange])

  if (!result) return <p role="status" className="py-16 text-center text-gray-500 dark:text-gray-400">Loading {tab === 'posts' ? 'posts' : 'authors'}…</p>
  if (result.error) return <div className="py-16 text-center"><p role="alert" className="mb-4 text-red-500">{result.error}</p><button type="button" onClick={onRefresh} className={buttonClass}>Try again</button></div>
  const { data } = result

  return <section aria-label={tab === 'posts' ? 'Following feed' : 'Followed authors'}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
      <p>{data.total} {tab === 'posts' ? 'published posts' : 'authors'}</p><button type="button" onClick={onRefresh} className={buttonClass}>Refresh</button>
    </div>
    {data.data.length === 0 && <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-bold text-gray-800 dark:text-gray-200">{tab === 'posts' ? 'No posts from followed authors yet' : 'Find your next favorite author'}</h2>
      <p className="mt-2 mb-5 text-sm text-gray-500 dark:text-gray-400">Open an author's profile from any post and select Follow. Their published posts will appear here.</p>
      <Link to="/dashboard" className="rounded-xl bg-bordo px-4 py-2 text-sm font-bold text-green">Explore published posts</Link>
    </div>}
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {data.data.map((item, index) => tab === 'posts' ? <BlogCard key={item.id} blog={item} index={index} /> : <article key={item.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <Link to={`/dashboard/authors/${item.id}`} className="mb-4 flex items-center gap-3 rounded-xl focus-visible:outline-bordo"><Avatar user={item} className="h-12 w-12 text-lg" /><h2 className="min-w-0 break-words font-bold text-gray-900 hover:text-bordo dark:text-white">{item.name}</h2></Link>
        {item.bio && <p className="mb-4 line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-500 dark:text-gray-400">{item.bio}</p>}
        <p className="mb-5 mt-auto text-xs text-gray-400">{item.published_blogs_count} posts · {item.followers_count} followers</p>
        <FollowButton authorId={item.id} authorName={item.name} initialFollowing confirmUnfollow onChange={(follow) => { if (!follow.is_following) onRefresh() }} />
      </article>)}
    </div>
    {data.last_page > 1 && <nav aria-label="Following pagination" className="mt-8 flex flex-wrap items-center justify-center gap-4">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>Previous</button>
      <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {data.last_page}</span>
      <button type="button" disabled={page >= data.last_page} onClick={() => onPageChange(page + 1)} className={buttonClass}>Next</button>
    </nav>}
  </section>
}
