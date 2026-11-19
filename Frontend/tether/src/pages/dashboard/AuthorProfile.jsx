import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import api from '../../api/api'
import Avatar from '../../components/ui/Avatar'
import BlogCard from '../../components/ui/BlogCard'
import FollowButton from '../../components/ui/FollowButton'
import { useAuth } from '../../hooks/useAuth'

const buttonClass = 'rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300'

export default function AuthorProfile({ ownProfile = false }) {
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  if (ownProfile && (!isAuthenticated || !user?.id)) return <Navigate to="/login" replace />
  const authorId = ownProfile ? user.id : params.authorId
  return <AuthorProfileSession key={authorId} authorId={authorId} />
}

function AuthorProfileSession({ authorId }) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  return <AuthorProfilePage key={`${user?.id ?? 'guest'}:${page}:${version}`} authorId={authorId} page={page} onPageChange={setPage} onRefresh={() => setVersion((value) => value + 1)} />
}

function AuthorProfilePage({ authorId, page, onPageChange, onRefresh }) {
  const { user } = useAuth()
  const [result, setResult] = useState(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([api.get(`/authors/${authorId}`), api.get(`/authors/${authorId}/blogs`, { params: { page } })])
      .then(([{ data: author }, { data: blogs }]) => {
        if (cancelled) return
        if (page > blogs.last_page) { onPageChange(Math.max(1, blogs.last_page)); return }
        setResult({ author, blogs })
      })
      .catch((error) => {
        if (!cancelled) setResult({ error: error.response?.status === 404 ? 'This author profile is unavailable.' : 'Could not load this profile. Please try again.' })
      })
    return () => { cancelled = true }
  }, [authorId, page, onPageChange])

  if (!result) return <p role="status" className="py-16 text-center text-gray-500 dark:text-gray-400">Loading author profile…</p>
  if (result.error) return <div className="mx-auto max-w-3xl py-16 text-center"><p role="alert" className="mb-4 text-gray-600 dark:text-gray-300">{result.error}</p><button type="button" className={buttonClass} onClick={onRefresh}>Try again</button></div>
  const { author, blogs } = result

  return (
    <div className="mx-auto max-w-6xl">
      <section aria-label="Author profile" className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar user={author} className="h-20 w-20 text-3xl" />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-bordo">Public profile</p>
            <h1 className="break-words text-2xl font-extrabold text-gray-900 dark:text-white">{author.name}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Joined {new Date(author.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          </div>
          {user?.id === author.id && <Link to="/dashboard/profile/edit" className={buttonClass}>Edit profile</Link>}
          <FollowButton key={`${author.id}:${user?.id ?? 'guest'}`} authorId={author.id} initialFollowing={author.is_following} onChange={(follow) => setResult((previous) => ({ ...previous, author: { ...previous.author, ...follow } }))} />
        </div>
        {author.bio && <p className="mt-6 max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600 dark:text-gray-300">{author.bio}</p>}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p><span className="font-bold text-gray-900 dark:text-white">{author.published_blogs_count}</span> published {author.published_blogs_count === 1 ? 'post' : 'posts'}</p>
          <Link to={`/dashboard/authors/${author.id}/followers`} className="group rounded-md hover:text-bordo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bordo" title="View followers"><span className="font-bold text-gray-900 group-hover:text-bordo dark:text-white">{author.followers_count}</span> {author.followers_count === 1 ? 'follower' : 'followers'}</Link>
          <Link to={`/dashboard/authors/${author.id}/following`} className="group rounded-md hover:text-bordo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bordo" title="View following"><span className="font-bold text-gray-900 group-hover:text-bordo dark:text-white">{author.following_count}</span> following</Link>
        </div>
      </section>
      <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">Published posts</h2>
      {blogs.data.length === 0
        ? <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">No published posts yet.</p>
        : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">{blogs.data.map((blog, index) => <BlogCard key={blog.id} blog={blog} index={index} />)}</div>}
      {blogs.last_page > 1 && <nav aria-label="Author posts pagination" className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>Previous</button>
        <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {blogs.last_page}</span>
        <button type="button" disabled={page >= blogs.last_page} onClick={() => onPageChange(page + 1)} className={buttonClass}>Next</button>
      </nav>}
    </div>
  )
}
