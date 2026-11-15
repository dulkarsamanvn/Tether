import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api/api'
import Avatar from '../../components/ui/Avatar'
import FollowButton from '../../components/ui/FollowButton'
import { useAuth } from '../../hooks/useAuth'

const buttonClass = 'rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300'
const sorts = [['followers', 'Most followed'], ['posts', 'Most posts'], ['newest', 'Newest authors']]

export default function DiscoverAuthors() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [version, setVersion] = useState(0)
  const query = (params.get('q') ?? '').trim().slice(0, 100)
  const sort = sorts.some(([value]) => value === params.get('sort')) ? params.get('sort') : 'followers'
  const requestedPage = Number(params.get('page') ?? 1)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000 ? requestedPage : 1

  function updateFilter(name, value) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(name, value)
      else next.delete(name)
      next.delete('page')
      return next
    })
  }

  const changePage = useCallback((value) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value > 1) next.set('page', String(value))
      else next.delete('page')
      return next
    })
  }, [setParams])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Discover authors</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Find new voices and follow the people you enjoy reading.</p>
        </div>
        <Link to="/dashboard" className={buttonClass}>Explore posts</Link>
      </div>

      <AuthorSearch key={query} query={query} onSearch={(value) => updateFilter('q', value.trim())} />

      <div className="mb-7 flex flex-wrap items-center gap-3" role="group" aria-label="Sort authors">
        <span className="mr-1 text-xs font-bold uppercase tracking-wider text-gray-400">Sort by</span>
        {sorts.map(([value, label]) => <button key={value} type="button" aria-pressed={sort === value} onClick={() => updateFilter('sort', value)} className={`rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-bordo ${sort === value ? 'bg-bordo text-green' : 'bg-gray-100 text-gray-500 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>{label}</button>)}
      </div>

      <AuthorResults key={JSON.stringify([user?.id, query, sort, page, version])} query={query} sort={sort} page={page} onPageChange={changePage} onRefresh={() => setVersion((value) => value + 1)} onClear={() => updateFilter('q', '')} />
    </div>
  )
}

function AuthorSearch({ query, onSearch }) {
  const [value, setValue] = useState(query)
  return (
    <form role="search" aria-label="Search authors" onSubmit={(event) => { event.preventDefault(); onSearch(value) }} className="mb-6 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-64">
        <label htmlFor="author-search" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">Search by name or bio</label>
        <div className="relative">
          <svg aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={2} strokeLinecap="round" /></svg>
          <input id="author-search" type="search" value={value} maxLength={100} onChange={(event) => setValue(event.target.value)} placeholder="Try a name, design, travel…" className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-bordo focus:ring-4 focus:ring-bordo/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        </div>
      </div>
      <button type="submit" className="rounded-xl bg-bordo px-5 py-3 text-sm font-bold text-green hover:bg-bordo-dark focus-visible:outline-bordo">Search</button>
      {(value || query) && <button type="button" onClick={() => { setValue(''); onSearch('') }} className={`${buttonClass} py-3`}>Clear</button>}
    </form>
  )
}

function AuthorResults({ query, sort, page, onPageChange, onRefresh, onClear }) {
  const [result, setResult] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    api.get('/authors', { params: { q: query || undefined, sort, page }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        if (page > data.last_page) { onPageChange(Math.max(1, data.last_page)); return }
        setResult({ data })
      })
      .catch(() => { if (!controller.signal.aborted) setResult({ error: 'Could not load authors. Please try again.' }) })
    return () => controller.abort()
  }, [query, sort, page, onPageChange])

  function updateFollow(id, follow) {
    setResult((previous) => ({ data: { ...previous.data, data: previous.data.data.map((author) => author.id === id ? { ...author, ...follow } : author) } }))
  }

  if (!result) return <div role="status" className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Finding authors…</div>
  if (result.error) return <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900"><p role="alert" className="mb-4 text-sm text-gray-600 dark:text-gray-300">{result.error}</p><button type="button" onClick={onRefresh} className={buttonClass}>Try again</button></div>
  const { data } = result

  return (
    <section aria-label="Discovered authors">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="break-words text-sm text-gray-500 dark:text-gray-400">{data.total} {data.total === 1 ? 'author' : 'authors'}{query ? <> matching <span className="font-semibold text-gray-700 dark:text-gray-300">“{query}”</span></> : ' to discover'}</p>
        <button type="button" onClick={onRefresh} className={buttonClass}>Refresh</button>
      </div>
      {data.data.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-bold text-gray-800 dark:text-gray-200">{query ? 'No authors found' : 'No authors to discover yet'}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{query ? "Try another name or a topic from an author's bio." : 'Authors will appear here after publishing their first post.'}</p>
          {query && <button type="button" onClick={onClear} className={`${buttonClass} mt-5`}>Clear search</button>}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((author) => (
            <li key={author.id} className="flex min-w-0 flex-col rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-start justify-between gap-3">
                <Link to={`/dashboard/authors/${author.id}`} className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-bordo"><Avatar user={author} className="h-14 w-14 text-xl" /><h2 className="min-w-0 break-words font-bold text-gray-900 hover:text-bordo dark:text-white">{author.name}</h2></Link>
              </div>
              {author.bio && <p className="mb-5 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-500 dark:text-gray-400">{author.bio}</p>}
              <div className="mb-5 mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                <Link to={`/dashboard/authors/${author.id}`} className="rounded-md hover:text-bordo focus-visible:outline-bordo"><span className="font-bold text-gray-800 dark:text-gray-200">{author.published_blogs_count}</span> {author.published_blogs_count === 1 ? 'post' : 'posts'}</Link>
                <Link to={`/dashboard/authors/${author.id}/followers`} className="rounded-md hover:text-bordo focus-visible:outline-bordo"><span className="font-bold text-gray-800 dark:text-gray-200">{author.followers_count}</span> {author.followers_count === 1 ? 'follower' : 'followers'}</Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <FollowButton authorId={author.id} authorName={author.name} initialFollowing={author.is_following} confirmUnfollow onChange={(follow) => updateFollow(author.id, follow)} />
                <Link to={`/dashboard/authors/${author.id}`} className="rounded-md text-sm font-semibold text-gray-500 hover:text-bordo focus-visible:outline-bordo dark:text-gray-400">View profile <span aria-hidden="true">→</span></Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data.last_page > 1 && <nav aria-label="Author discovery pagination" className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>Previous</button>
        <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {data.last_page}</span>
        <button type="button" disabled={page >= data.last_page} onClick={() => onPageChange(page + 1)} className={buttonClass}>Next</button>
      </nav>}
    </section>
  )
}
