import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'

export default function BookmarkButton({ blogId, initialSaved = false, onChange }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function toggleBookmark(event) {
    event.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (saving) return

    setSaving(true)
    setError('')
    try {
      const { data } = saved
        ? await api.delete(`/blogs/${blogId}/bookmark`)
        : await api.put(`/blogs/${blogId}/bookmark`)
      setSaved(data.is_bookmarked)
      onChange?.(data.is_bookmarked)
    } catch {
      setError(saved ? 'Could not remove this blog. Try again.' : 'Could not save this blog. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggleBookmark}
        disabled={saving}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from saved blogs' : 'Save blog'}
        title={!isAuthenticated ? 'Sign in to save this blog' : saved ? 'Remove from saved blogs' : 'Save for later'}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo disabled:opacity-60 disabled:cursor-wait ${saved
          ? 'border-bordo bg-bordo text-green'
          : 'border-gray-200 bg-white text-gray-600 hover:border-bordo dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-bordo'}`}
      >
        <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4V4Z" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
      </button>
      {error && <p role="alert" className="max-w-48 text-right text-xs text-red-500">{error}</p>}
    </div>
  )
}
