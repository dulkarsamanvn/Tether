import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/api'
import Avatar from '../../components/ui/Avatar'
import FollowButton from '../../components/ui/FollowButton'
import { useAuth } from '../../hooks/useAuth'

const buttonClass = 'rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300'

export default function AuthorConnections({ kind }) {
  const { authorId } = useParams()
  return <ConnectionsSession key={`${authorId}:${kind}`} authorId={authorId} kind={kind} />
}

function ConnectionsSession({ authorId, kind }) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  return <ConnectionsPage key={`${user?.id ?? 'guest'}:${page}:${version}`} authorId={authorId} kind={kind} page={page} onPageChange={setPage} onRefresh={() => setVersion((value) => value + 1)} />
}

function ConnectionsPage({ authorId, kind, page, onPageChange, onRefresh }) {
  const { user } = useAuth()
  const [result, setResult] = useState(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([api.get(`/authors/${authorId}`), api.get(`/authors/${authorId}/${kind}`, { params: { page } })])
      .then(([{ data: author }, { data: people }]) => {
        if (cancelled) return
        if (page > people.last_page) { onPageChange(Math.max(1, people.last_page)); return }
        setResult({ author, people })
      })
      .catch((error) => {
        if (!cancelled) setResult({ error: error.response?.status === 404 ? 'This author profile is unavailable.' : 'Could not load this list. Please try again.' })
      })
    return () => { cancelled = true }
  }, [authorId, kind, page, onPageChange])

  const profileUrl = `/dashboard/authors/${authorId}`
  if (!result) return <p role="status" className="py-16 text-center text-gray-500 dark:text-gray-400">Loading {kind}…</p>
  if (result.error) return <div className="mx-auto max-w-6xl py-16 text-center"><p role="alert" className="mb-4 text-gray-600 dark:text-gray-300">{result.error}</p><button type="button" onClick={onRefresh} className={buttonClass}>Try again</button><Link to={profileUrl} className="ml-4 text-sm font-semibold text-bordo underline">Back to profile</Link></div>
  const { author, people } = result
  const isOwnProfile = user?.id === author.id

  return (
    <div className="mx-auto max-w-6xl">
      <Link to={profileUrl} className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-bordo focus-visible:outline-bordo dark:text-gray-400"><span aria-hidden="true">←</span> Back to profile</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar user={author} className="h-14 w-14 text-xl" />
          <div className="min-w-0"><h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{kind === 'followers' ? 'Followers' : 'Following'}</h1><Link to={profileUrl} className="mt-1 block break-words text-sm text-gray-500 hover:text-bordo dark:text-gray-400">{author.name}</Link></div>
        </div>
        {isOwnProfile && <Link to="/dashboard/following" className={buttonClass}>View following feed</Link>}
      </div>
      <nav aria-label="Profile connections" className="mb-7 flex flex-wrap gap-2">
        {[['followers', 'Followers', author.followers_count], ['following', 'Following', author.following_count]].map(([value, label, count]) => (
          <Link key={value} to={`/dashboard/authors/${author.id}/${value}`} aria-current={kind === value ? 'page' : undefined} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-bordo ${kind === value ? 'bg-bordo text-green' : 'bg-gray-100 text-gray-500 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
            {label}<span className="rounded-full bg-white/40 px-2 py-0.5 text-xs dark:bg-black/10">{count}</span>
          </Link>
        ))}
      </nav>
      <section aria-label={`${kind === 'followers' ? 'Followers' : 'Following'} list`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{people.total} {kind === 'followers' ? (people.total === 1 ? 'follower' : 'followers') : (people.total === 1 ? 'account' : 'accounts')}</p>
          <button type="button" onClick={onRefresh} className={buttonClass}>Refresh</button>
        </div>
        {people.data.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-bold text-gray-800 dark:text-gray-200">{kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{kind === 'followers' ? 'People who follow this profile will appear here.' : 'People followed by this profile will appear here.'}</p>
            {isOwnProfile && kind === 'following' && <Link to="/dashboard" className="mt-5 inline-block rounded-xl bg-bordo px-4 py-2 text-sm font-bold text-green">Discover authors through their posts</Link>}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {people.data.map((person) => (
              <li key={person.id} className="flex min-w-0 flex-col rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <Link to={`/dashboard/authors/${person.id}`} className="mb-4 flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-bordo"><Avatar user={person} className="h-12 w-12 text-lg" /><h2 className="min-w-0 break-words font-bold text-gray-900 hover:text-bordo dark:text-white">{person.name}</h2></Link>
                {person.bio && <p className="mb-4 line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-500 dark:text-gray-400">{person.bio}</p>}
                <p className="mb-5 mt-auto text-xs text-gray-400">{person.published_blogs_count} {person.published_blogs_count === 1 ? 'post' : 'posts'} · {person.followers_count} {person.followers_count === 1 ? 'follower' : 'followers'}</p>
                <FollowButton authorId={person.id} authorName={person.name} initialFollowing={person.is_following} confirmUnfollow onChange={onRefresh} />
              </li>
            ))}
          </ul>
        )}
        {people.last_page > 1 && <nav aria-label={`${kind} pagination`} className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>Previous</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {people.last_page}</span>
          <button type="button" disabled={page >= people.last_page} onClick={() => onPageChange(page + 1)} className={buttonClass}>Next</button>
        </nav>}
      </section>
    </div>
  )
}
