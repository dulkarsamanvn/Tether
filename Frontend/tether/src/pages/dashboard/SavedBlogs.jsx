import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../../api/api'
import BlogCard from '../../components/ui/BlogCard'
import BookmarkButton from '../../components/ui/BookmarkButton'
import { useAuth } from '../../hooks/useAuth'

export default function SavedBlogs() {
  const { user, isAuthenticated } = useAuth()
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <SavedBlogPage
      key={`${user?.id}:${page}:${version}`}
      page={page}
      onPageChange={setPage}
      onRefresh={() => setVersion((value) => value + 1)}
    />
  )
}

function SavedBlogPage({ page, onPageChange, onRefresh }) {
  const [result, setResult] = useState(null)
  const loading = result === null
  const data = result?.data
  const buttonClass = 'rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-300'

  useEffect(() => {
    let cancelled = false
    api.get('/bookmarks', { params: { page } })
      .then(({ data }) => {
        if (cancelled) return
        // Removing the final bookmark on a page should return to a valid page.
        if (page > data.last_page) {
          onPageChange(Math.max(1, data.last_page))
          return
        }
        setResult({ data, error: null })
      })
      .catch(() => {
        if (!cancelled) setResult({ data: null, error: 'Failed to load saved blogs. Please try again.' })
      })
    return () => { cancelled = true }
  }, [page, onPageChange])

  return (
    <div className="max-w-7xl mx-auto" aria-busy={loading}>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Saved Blogs</h1>
      <p className="mt-1 mb-8 text-sm text-gray-400 dark:text-gray-500">
        {loading ? 'Loading your reading list...' : data ? `${data.total} saved ${data.total === 1 ? 'article' : 'articles'}` : 'Your personal reading list.'}
      </p>

      {loading && <p role="status" className="py-12 text-center text-gray-500 dark:text-gray-400">Loading saved blogs...</p>}

      {result?.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/20">
          <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{result.error}</p>
          <button type="button" onClick={onRefresh} className={buttonClass}>Try again</button>
        </div>
      )}

      {data?.data.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600">
            <svg aria-hidden="true" className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4V4Z" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">No saved blogs yet</h2>
          <p className="mt-2 mb-5 text-sm text-gray-400 dark:text-gray-500">Save a blog while reading to find it here later.</p>
          <Link to="/dashboard" className="rounded-xl bg-bordo px-5 py-2.5 text-sm font-bold text-green focus-visible:outline-bordo">Browse blogs</Link>
        </div>
      )}

      {data?.data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.data.map((blog, index) => (
            <div key={blog.id} className="relative [&>article]:h-full">
              <BlogCard blog={blog} index={index} />
              <div className="absolute top-3 right-3">
                <BookmarkButton blogId={blog.id} initialSaved onChange={(saved) => { if (!saved) onRefresh() }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.last_page > 1 && (
        <nav aria-label="Saved blogs pagination" className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>Previous</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {data.last_page}</span>
          <button type="button" disabled={page >= data.last_page} onClick={() => onPageChange(page + 1)} className={buttonClass}>Next</button>
        </nav>
      )}
    </div>
  )
}
