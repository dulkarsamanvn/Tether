import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'

export default function LikeButton({ blogId, initialLiked = false, initialCount = 0 }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [reaction, setReaction] = useState({ liked: initialLiked, count: initialCount })
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const { liked, count } = reaction

  async function toggleLike(event) {
    event.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (updating) return

    setUpdating(true)
    setError('')
    try {
      const { data } = liked
        ? await api.delete(`/blogs/${blogId}/like`)
        : await api.put(`/blogs/${blogId}/like`)
      setReaction({ liked: data.is_liked, count: data.likes_count })
    } catch {
      setError('Could not update your like. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggleLike}
        disabled={updating}
        aria-pressed={liked}
        aria-busy={updating}
        aria-label={`${liked ? 'Unlike' : 'Like'} this blog (${count} ${count === 1 ? 'like' : 'likes'})`}
        title={!isAuthenticated ? 'Sign in to like this blog' : liked ? 'Unlike this blog' : 'Like this blog'}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo disabled:opacity-60 disabled:cursor-wait ${liked
          ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
          : 'border-gray-200 bg-white text-gray-500 hover:border-rose-300 hover:text-rose-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-rose-700 dark:hover:text-rose-400'}`}
      >
        <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {liked ? 'Liked' : 'Like'}
        <span className="tabular-nums" aria-live="polite">{count}</span>
      </button>
      {error && <p role="alert" className="max-w-56 text-xs text-red-500">{error}</p>}
    </div>
  )
}
