import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'

const buttonClass = 'rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-300'

export default function TrashBlogs() {
  const { user, isAuthenticated } = useAuth()
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState(null)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const refresh = () => setVersion((value) => value + 1)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Trash</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recover your deleted blog posts here.</p>
        </div>
        <Link to="/dashboard/blogs" className={buttonClass}>Back to My Blogs</Link>
      </div>

      <p className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        Posts in Trash are hidden from readers. Restoring keeps their content, images, comments, likes, and bookmarks.
        Published posts become visible to readers again immediately; drafts remain private.
      </p>

      {notice && (
        <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
          {notice} <Link to="/dashboard/blogs" className="font-semibold underline">View My Blogs</Link>
        </p>
      )}

      <TrashList
        key={`${user?.id}:${page}:${version}`}
        page={page}
        onPageChange={setPage}
        onRefresh={refresh}
        onRestored={(blog) => {
          setNotice(`“${blog.title}” restored as ${blog.status === 'published' ? 'published' : 'a draft'}.`)
          refresh()
        }}
      />
    </div>
  )
}

function TrashList({ page, onPageChange, onRefresh, onRestored }) {
  const [result, setResult] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const loading = result === null
  const data = result?.data

  useEffect(() => {
    let cancelled = false
    api.get('/my-blogs/trash', { params: { page } })
      .then(({ data }) => {
        if (cancelled) return
        // Restoring the final post on a page should return to a valid page.
        if (page > data.last_page) {
          onPageChange(Math.max(1, data.last_page))
          return
        }
        setResult({ data, error: null })
      })
      .catch(() => {
        if (!cancelled) setResult({ data: null, error: 'Failed to load Trash. Please try again.' })
      })
    return () => { cancelled = true }
  }, [page, onPageChange])

  const restore = async (blog) => {
    if (restoringId !== null) return
    setRestoringId(blog.id)
    setActionError(null)
    try {
      const { data } = await api.put(`/blogs/${blog.id}/restore`)
      onRestored(data.blog)
    } catch (err) {
      setActionError(err.response?.status === 404
        ? 'This post is no longer in Trash. Refresh the list to see the latest posts.'
        : 'Failed to restore this post. Please try again.')
      setRestoringId(null)
    }
  }

  return (
    <section aria-label="Trashed blogs" aria-busy={loading}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? 'Loading Trash...' : data ? `${data.total} ${data.total === 1 ? 'post' : 'posts'} in Trash` : 'Your deleted posts.'}
        </p>
        <button type="button" onClick={onRefresh} disabled={restoringId !== null} className={buttonClass}>Refresh</button>
      </div>

      {(result?.error || actionError) && (
        <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          {result?.error || actionError}
        </p>
      )}

      {loading && <p role="status" className="py-12 text-center text-gray-500 dark:text-gray-400">Loading deleted posts...</p>}

      {data?.data.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-20 text-center dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Trash is empty</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Posts you move to Trash will appear here until you restore them.</p>
        </div>
      )}

      {data?.data.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                {['Title', 'Restores as', 'Moved to Trash', 'Actions'].map((heading) => (
                  <th key={heading} scope="col" className="px-5 py-3 font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((blog) => (
                <tr key={blog.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {blog.featured_image_url && <img src={blog.featured_image_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />}
                      <div className="min-w-40 max-w-sm">
                        <p className="break-words font-semibold text-gray-900 dark:text-white">{blog.title}</p>
                        {blog.excerpt && <p className="mt-1 line-clamp-2 break-words text-xs text-gray-500 dark:text-gray-400">{blog.excerpt}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${blog.status === 'published'
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                      {blog.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                    <time dateTime={blog.deleted_at}>{new Date(blog.deleted_at).toLocaleString()}</time>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => restore(blog)}
                      disabled={restoringId !== null}
                      aria-label={`Restore ${blog.title}`}
                      className="rounded-xl bg-bordo px-4 py-2 text-sm font-bold text-green focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {restoringId === blog.id ? 'Restoring...' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.last_page > 1 && (
        <nav aria-label="Trash pagination" className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button type="button" disabled={page <= 1 || restoringId !== null} onClick={() => onPageChange(page - 1)} className={buttonClass}>Previous</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {data.last_page}</span>
          <button type="button" disabled={page >= data.last_page || restoringId !== null} onClick={() => onPageChange(page + 1)} className={buttonClass}>Next</button>
        </nav>
      )}
    </section>
  )
}
