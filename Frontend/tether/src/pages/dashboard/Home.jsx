import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/api'
import BlogCard from '../../components/ui/BlogCard'

export default function Home() {
  const [blogs, setBlogs]       = useState([])
  const [meta, setMeta]         = useState(null)      // pagination meta
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [params] = useSearchParams()


  useEffect(() => {
    fetchBlogs(page)
  }, [page])

  // Sync search query from URL param
  useEffect(() => {
    const q = params.get('q') ?? ''
    setSearch(q)
  }, [params])

  const fetchBlogs = async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/blogs?page=${p}`)
      setBlogs(data.data)
      setMeta(data)
    } catch {
      setError('Failed to load blogs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Client-side search filter
  const filtered = blogs.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.excerpt?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto">

      {/* ── Header ── */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
          Published Blogs
        </h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          {meta ? `${meta.total} article${meta.total !== 1 ? 's' : ''} published` : 'Loading…'}
        </p>
      </motion.div>

      {/* ── Search + controls ── */}
      <motion.div
        className="flex items-center gap-3 mb-8"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search blogs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800
              bg-white dark:bg-gray-900 text-gray-900 dark:text-white
              placeholder-gray-300 dark:placeholder-gray-600
              text-sm outline-none transition-all duration-200
              focus:border-sage dark:focus:border-sage focus:ring-4 focus:ring-sage/15"
          />
        </div>

        <button
          onClick={() => fetchBlogs(page)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl
            font-semibold text-sm transition-colors duration-200
            shadow-md shadow-bordo/20"
          style={{ background: '#E89951', color: '#18190F' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <motion.div
          className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
            text-red-600 dark:text-red-400 rounded-xl px-5 py-4 mb-6 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse">
              <div className="h-44 bg-gray-100 dark:bg-gray-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-full" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-5/6" />
                <div className="flex justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-20" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Blog grid ── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((blog, i) => (
            <BlogCard key={blog.id} blog={blog} index={i} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && !error && (
        <motion.div
          className="flex flex-col items-center justify-center py-24 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
            <svg className="w-9 h-9 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-semibold text-base mb-1">
            {search ? 'No blogs match your search' : 'No blogs published yet'}
          </p>
          <p className="text-gray-300 dark:text-gray-600 text-sm">
            {search ? 'Try a different keyword.' : 'Published blogs will appear here.'}
          </p>
        </motion.div>
      )}

      {/* ── Pagination ── */}
      {!loading && meta && meta.last_page > 1 && (
        <motion.div
          className="flex items-center justify-center gap-2 mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
              border-2 border-gray-100 dark:border-gray-800
              text-gray-500 dark:text-gray-400
              hover:border-green hover:text-green dark:hover:text-green
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200"
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
                  <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-200
                      ${p === page
                        ? 'bg-bordo text-cream shadow-md shadow-bordo/30'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
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
              hover:border-green hover:text-green dark:hover:text-green
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </motion.div>
      )}
    </div>
  )
}
