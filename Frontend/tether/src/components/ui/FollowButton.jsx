import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'

export default function FollowButton({ authorId, initialFollowing = false, onChange }) {
  const { user, isAuthenticated } = useAuth()
  const [following, setFollowing] = useState(initialFollowing)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo disabled:cursor-wait disabled:opacity-50'

  if (user?.id === authorId) return null
  if (!isAuthenticated) return <Link to="/login" className={`${buttonClass} border-bordo bg-bordo text-green`}>Sign in to follow</Link>

  async function toggle(event) {
    event.stopPropagation()
    if (updating) return
    setUpdating(true); setError(null)
    try {
      const { data } = following ? await api.delete(`/authors/${authorId}/follow`) : await api.put(`/authors/${authorId}/follow`)
      setFollowing(data.is_following)
      onChange?.(data)
    } catch (err) {
      setError(err.response?.status === 404 ? 'This author is no longer available.' : 'Could not update your follow. Please try again.')
    } finally { setUpdating(false) }
  }

  return <div className="flex flex-col items-start gap-2">
    <button type="button" onClick={toggle} disabled={updating} aria-pressed={following} aria-busy={updating}
      aria-label={following ? 'Unfollow this author' : 'Follow this author'} title={following ? 'Unfollow this author' : 'Follow this author'}
      className={`${buttonClass} ${following ? 'border-gray-200 text-gray-600 hover:border-bordo dark:border-gray-700 dark:text-gray-300' : 'border-bordo bg-bordo text-green hover:bg-bordo-dark'}`}>
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={following ? 'm5 12 4 4L19 6' : 'M12 5v14M5 12h14'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
      {updating ? 'Updating…' : following ? 'Following' : 'Follow'}
    </button>
    {error && <p role="alert" className="max-w-60 text-xs text-red-500">{error}</p>}
  </div>
}
