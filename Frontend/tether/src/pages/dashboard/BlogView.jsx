import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/api'
import BlogShare from '../../components/ui/BlogShare'
import BookmarkButton from '../../components/ui/BookmarkButton'
import LikeButton from '../../components/ui/LikeButton'
import { useAuth } from '../../hooks/useAuth'
import '../../styles/editor.css'

const STORAGE = 'http://localhost:8000/storage'

function readingTime(html = '') {
  const words = html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Fixed skeleton widths — no Math.random() (causes React strict mode issues)
const SKELETON_WIDTHS = ['92%', '78%', '85%', '70%', '88%', '75%', '80%', '65%']

export default function BlogView() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [blog,    setBlog]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  // Comments state
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false

    // ---- Blog data ----
    setLoading(true)
    setBlog(null)
    setError(null)

    api.get(`/blogs/${id}`)
      .then(({ data }) => {
        if (!cancelled) setBlog(data)
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err.response?.status === 404
              ? 'This post could not be found.'
              : 'Failed to load the post. Please try again.'
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // ---- Comments data ----
    setCommentsLoading(true)
    setCommentsError(null)
    api.get(`/blogs/${id}/comments`)
      .then(({ data }) => {
        if (!cancelled) setComments(data.data ?? data)
      })
      .catch((err) => {
        if (!cancelled) setCommentsError('Failed to load comments.')
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })

    return () => { cancelled = true }
  }, [id])

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-2 py-8 animate-pulse">
        <div className="h-5 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg mb-8" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-8" />
        <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl w-3/4 mb-3" />
        <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2 mb-8" />
        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-8" />
        <div className="space-y-3">
          {SKELETON_WIDTHS.map((w, i) => (
            <div key={i} className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg" style={{ width: w }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !blog) {
    return (
      <div className="max-w-3xl mx-auto px-2 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(232,153,81,0.1)' }}>
          <svg className="w-8 h-8" style={{ color: '#E89951' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-semibold text-gray-700 dark:text-gray-300 text-lg mb-1">
          {error ?? 'Something went wrong.'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: '#E89951', color: '#18190F' }}
        >
          ← Go back
        </button>
      </div>
    )
  }

  // ── Blog data ────────────────────────────────────────────────────────────
  const coverUrl  = blog.featured_image ? `${STORAGE}/${blog.featured_image}` : null
  const mins      = readingTime(blog.content ?? '')
  const published = fmtDate(blog.published_at ?? blog.created_at)
  const shareUrl = `${window.location.origin}${window.location.pathname}`

  return (
    <>
    <motion.div
      className="max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Back ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold
            text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
            transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-start gap-2">
          <BookmarkButton key={`${blog.id}:${user?.id}`} blogId={blog.id} initialSaved={blog.is_bookmarked ?? false} />
          <BlogShare key={blog.id} title={blog.title} url={shareUrl} />
        </div>
      </div>

      {/* ── Cover ── */}
      <motion.div
        className="w-full h-72 rounded-2xl overflow-hidden mb-8 shadow-lg"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.05 }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={blog.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #E89951 0%, #18190F 100%)' }}>
            <svg className="w-16 h-16 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
      </motion.div>

      {/* ── Header ── */}
      <motion.header
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {blog.is_featured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: '#E89951', color: '#18190F' }}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Featured
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
            style={{ background: 'rgba(165,207,131,0.12)', borderColor: 'rgba(165,207,131,0.35)', color: '#3d7a24' }}>
            Published
          </span>
          {(blog.categories || []).map(cat => (
            <span key={cat.id} className="px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(232,153,81,0.15)', color: '#E89951' }}>
              {cat.name}
            </span>
          ))}
          {(blog.tags || []).map(tag => (
            <span key={tag.id} className="px-2.5 py-1 rounded-full text-[11px] font-medium
              bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              #{tag.name}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight mb-4
          text-gray-900 dark:text-white">
          {blog.title}
        </h1>

        {/* Excerpt */}
        {blog.excerpt && (
          <p className="text-lg leading-relaxed mb-5 text-gray-500 dark:text-gray-400">
            {blog.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-6
          border-b border-gray-100 dark:border-gray-800">

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: '#A5CF83', color: '#18190F' }}>
              {blog.user?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {blog.user?.name ?? 'Author'}
            </span>
          </div>

          <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {published}
          </span>

          <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {mins} min read
          </span>

          <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {blog.view_count ?? 0} views
          </span>
          <LikeButton
            key={`${blog.id}:${user?.id}`}
            blogId={blog.id}
            initialLiked={blog.is_liked ?? false}
            initialCount={blog.likes_count ?? 0}
          />
        </div>
      </motion.header>

      {/* ── Content ── */}
      <motion.article
        className="tiptap-editor pb-16"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.18 }}
        dangerouslySetInnerHTML={{ __html: blog.content ?? '' }}
      />

      {/* ── Comments ── */}
      <section className="mt-12 border-t border-gray-100 dark:border-gray-800 pt-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Comments</h2>

        {/* Comment list */}
        {commentsLoading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading comments…</p>
        ) : commentsError ? (
          <p className="text-red-500">{commentsError}</p>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
        ) : (
          <ul className="space-y-4 mb-6">
            {comments.map((c) => (
              <li key={c.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{c.user?.name ?? 'Guest'}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  {(user?.id === c.user_id || user?.id === blog?.user_id) && (
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete comment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300">{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        {/* New comment form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!newComment.trim()) return
            setSubmitting(true)
            try {
              await api.post(`/blogs/${id}/comments`, { body: newComment.trim() })
              const { data } = await api.get(`/blogs/${id}/comments`)
              setComments(data.data ?? data)
              setNewComment('')
            } catch {
              alert('Failed to post comment.')
            } finally {
              setSubmitting(false)
            }
          }}
          className="space-y-3"
        >
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-bordo focus:ring-2 focus:ring-bordo/20 outline-none transition"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: '#E89951', color: '#18190F' }}
          >
            {submitting ? 'Posting…' : 'Post Comment'}
          </button>
        </form>
      </section>

      {/* ── Footer ── */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-8 pb-12
        flex items-center justify-between">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base"
            style={{ background: '#A5CF83', color: '#18190F' }}>
            {blog.user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {blog.user?.name ?? 'Author'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Author</p>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: '#E89951', color: '#18190F' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to blogs
        </button>
      </div>
    </motion.div>

      {/* ── Delete comment modal ── */}
      <AnimatePresence>
        {deleteTarget && (
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
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Delete Comment?</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 leading-relaxed">
                This comment by <span className="font-medium text-gray-600 dark:text-gray-300">{deleteTarget.user?.name ?? 'Guest'}</span> will be permanently deleted. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteTarget(null); setDeleting(false) }}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800
                    text-gray-500 dark:text-gray-400 text-sm font-semibold
                    hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      await api.delete(`/comments/${deleteTarget.id}`)
                      setComments((prev) => prev.filter((x) => x.id !== deleteTarget.id))
                      setDeleteTarget(null)
                    } catch {
                      alert('Failed to delete comment.')
                    } finally {
                      setDeleting(false)
                    }
                  }}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600
                    text-white text-sm font-semibold shadow-md shadow-red-500/25
                    disabled:opacity-60 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2 transition-colors"
                >
                  {deleting ? (
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
        )}
      </AnimatePresence>
    </>
  )
}
