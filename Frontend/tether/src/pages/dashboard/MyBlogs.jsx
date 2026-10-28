import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    published: {
      bg: 'rgba(165,207,131,0.15)',
      border: 'rgba(165,207,131,0.4)',
      dot: '#A5CF83',
      text: '#3d7a24',
    },
    draft: {
      bg: 'rgba(236,182,95,0.15)',
      border: 'rgba(236,182,95,0.4)',
      dot: '#ECB65F',
      text: '#8a5e10',
    },
  }
  const s = styles[status] ?? styles.draft
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Confirm delete modal ───────────────────────────────────────────────────
function DeleteModal({ blog, onConfirm, onCancel, loading }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-7 max-w-sm w-full border border-gray-100 dark:border-gray-800"
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1,   opacity: 1, y: 0 }}
        exit={{   scale: 0.9, opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Delete Blog?</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 leading-relaxed">
          "<span className="font-medium text-gray-600 dark:text-gray-300">{blog?.title}</span>" will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800
              text-gray-500 dark:text-gray-400 text-sm font-semibold
              hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600
              text-white text-sm font-semibold shadow-md shadow-red-500/25
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : null}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Blog row ──────────────────────────────────────────────────────────────
function BlogRow({ blog, index, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const formattedDate = blog.created_at
    ? new Date(blog.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const publishedDate = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <motion.tr
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group border-b border-gray-100 dark:border-gray-800 last:border-0
        hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors duration-150"
    >
      {/* Title + excerpt */}
      <td className="py-4 px-5">
        <div className="flex items-start gap-3">
          {/* Gradient thumbnail */}
          <div
            className="w-10 h-10 rounded-xl shrink-0 mt-0.5"
            style={{
              background: blog.featured_image
                ? `url(http://localhost:8000/storage/${blog.featured_image}) center/cover`
                : `linear-gradient(135deg, #E89951 0%, #ECB65F 100%)`,
            }}
          />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug truncate max-w-xs">
              {blog.title}
            </p>
            {blog.excerpt && (
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 truncate max-w-xs">
                {blog.excerpt}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-4 whitespace-nowrap">
        <StatusBadge status={blog.status} />
      </td>

      {/* Views */}
      <td className="py-4 px-4 whitespace-nowrap">
        <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          {blog.view_count ?? 0}
        </span>
      </td>

      {/* Date */}
      <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
        <div>{formattedDate}</div>
        {publishedDate && (
          <div className="text-[10px] mt-0.5" style={{ color: '#A5CF83' }}>
            Published {publishedDate}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="py-4 px-4 whitespace-nowrap">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {/* Edit */}
          <button
            onClick={() => navigate(`/dashboard/blogs/${blog.id}/edit`)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-bordo hover:bg-bordo/10
              dark:hover:text-bordo dark:hover:bg-bordo/10 transition-all duration-150"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(blog)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50
              dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-all duration-150"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </motion.tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MyBlogs() {
  const navigate = useNavigate()

  const [blogs, setBlogs]           = useState([])
  const [meta, setMeta]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [page, setPage]             = useState(1)
  const [statusFilter, setStatus]   = useState('all')
  const [search, setSearch]         = useState('')
  const [toDelete, setToDelete]     = useState(null)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => { fetchBlogs(page) }, [page, statusFilter])

  const fetchBlogs = async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: p })
      if (statusFilter !== 'all') params.append('status', statusFilter)
      const { data } = await api.get(`/my-blogs?${params}`)
      setBlogs(data.data)
      setMeta(data)
    } catch {
      setError('Failed to load your blogs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/blogs/${toDelete.id}`)
      setBlogs((prev) => prev.filter((b) => b.id !== toDelete.id))
      setToDelete(null)
    } catch {
      // could show toast here
    } finally {
      setDeleting(false)
    }
  }

  const filtered = blogs.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { label: 'All',       value: 'all' },
    { label: 'Published', value: 'published' },
    { label: 'Draft',     value: 'draft' },
  ]

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Header ── */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">My Blogs</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {meta ? `${meta.total} article${meta.total !== 1 ? 's' : ''} total` : 'Loading…'}
          </p>
        </div>

        <motion.button
          onClick={() => navigate('/dashboard/write')}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-bordo/20 transition-colors"
          style={{ background: '#E89951', color: '#18190F' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4"/>
          </svg>
          New Blog
        </motion.button>
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div
        className="grid grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        {[
          { label: 'Total',     value: meta?.total ?? '—',      color: '#E89951', bg: 'rgba(232,153,81,0.1)'  },
          { label: 'Published', value: meta?.total ?? '—',      color: '#A5CF83', bg: 'rgba(165,207,131,0.1)' },
          { label: 'Views',     value: blogs.reduce((a, b) => a + (b.view_count ?? 0), 0), color: '#ECB65F', bg: 'rgba(236,182,95,0.1)' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
              <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Filters + search ── */}
      <motion.div
        className="flex items-center gap-3 mb-5"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
      >
        {/* Status tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1) }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                ${statusFilter === t.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search your blogs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-gray-100 dark:border-gray-800
              bg-white dark:bg-gray-900 text-gray-900 dark:text-white
              placeholder-gray-300 dark:placeholder-gray-600 text-sm outline-none
              focus:border-sage dark:focus:border-sage focus:ring-4 focus:ring-sage/15
              transition-all duration-200"
          />
        </div>
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <motion.div
          className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
            text-red-600 dark:text-red-400 rounded-xl px-5 py-4 mb-5 text-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
          <button onClick={() => fetchBlogs(page)} className="ml-auto underline font-semibold hover:no-underline">
            Retry
          </button>
        </motion.div>
      )}

      {/* ── Table card ── */}
      <motion.div
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                </div>
                <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Title', 'Status', 'Views', 'Date', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide
                      text-gray-400 dark:text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((blog, i) => (
                  <BlogRow key={blog.id} blog={blog} index={i} onDelete={setToDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(232,153,81,0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#E89951' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {search ? 'No blogs match your search' : `No ${statusFilter !== 'all' ? statusFilter : ''} blogs yet`}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-600 mb-5">
              {search ? 'Try a different keyword.' : 'Start writing your first blog post.'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/dashboard/write')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-bordo/20 transition-colors"
                style={{ background: '#E89951', color: '#18190F' }}
              >
                Write your first post →
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Pagination ── */}
      {!loading && meta && meta.last_page > 1 && (
        <motion.div
          className="flex items-center justify-center gap-2 mt-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
              border-2 border-gray-100 dark:border-gray-800
              text-gray-500 dark:text-gray-400
              hover:border-bordo hover:text-bordo
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Prev
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: meta.last_page }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === meta.last_page || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-200
                      ${p === page ? 'text-green shadow-md shadow-bordo/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    style={p === page ? { background: '#E89951' } : {}}
                  >
                    {p}
                  </button>
                )
              )}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={page === meta.last_page}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
              border-2 border-gray-100 dark:border-gray-800
              text-gray-500 dark:text-gray-400
              hover:border-bordo hover:text-bordo
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </motion.div>
      )}

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {toDelete && (
          <DeleteModal
            blog={toDelete}
            onConfirm={handleDelete}
            onCancel={() => setToDelete(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
