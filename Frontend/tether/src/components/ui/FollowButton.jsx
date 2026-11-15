import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'

export default function FollowButton({ authorId, authorName = 'this author', initialFollowing = false, confirmUnfollow = false, onChange }) {
  const { user, isAuthenticated } = useAuth()
  const [following, setFollowing] = useState(initialFollowing)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const dialogRef = useRef(null)
  const dialogId = useId()
  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo disabled:cursor-wait disabled:opacity-50'

  if (user?.id === authorId) return null
  if (!isAuthenticated) return <Link to="/login" className={`${buttonClass} border-bordo bg-bordo text-green`}>Sign in to follow</Link>

  function toggle(event) {
    event.stopPropagation()
    if (updating) return
    setError(null)
    if (following && confirmUnfollow) {
      setConfirming(true)
      dialogRef.current.showModal()
      return
    }
    updateFollow()
  }

  async function updateFollow() {
    if (updating) return
    setUpdating(true); setError(null)
    try {
      const { data } = following ? await api.delete(`/authors/${authorId}/follow`) : await api.put(`/authors/${authorId}/follow`)
      setFollowing(data.is_following)
      if (dialogRef.current?.open) dialogRef.current.close()
      setConfirming(false)
      onChange?.(data)
    } catch (err) {
      setError(err.response?.status === 404 ? 'This author is no longer available.' : 'Could not update your follow. Please try again.')
    } finally { setUpdating(false) }
  }

  return <div className="flex flex-col items-start gap-2">
    <button type="button" onClick={toggle} disabled={updating} aria-pressed={following} aria-busy={updating}
      aria-haspopup={confirmUnfollow && following ? 'dialog' : undefined}
      aria-controls={confirming ? dialogId : undefined}
      aria-label={following ? 'Unfollow this author' : 'Follow this author'} title={following ? 'Unfollow this author' : 'Follow this author'}
      className={`${buttonClass} ${following ? 'border-gray-200 text-gray-600 hover:border-bordo dark:border-gray-700 dark:text-gray-300' : 'border-bordo bg-bordo text-green hover:bg-bordo-dark'}`}>
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={following ? 'm5 12 4 4L19 6' : 'M12 5v14M5 12h14'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
      {updating ? 'Updating…' : following ? 'Following' : 'Follow'}
    </button>
    {error && !confirming && <p role="alert" className="max-w-60 text-xs text-red-500">{error}</p>}
    {confirmUnfollow && (
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`}
        onClose={() => { setConfirming(false); setError(null) }}
        onCancel={(event) => { if (updating) event.preventDefault() }}
        onClick={(event) => {
          event.stopPropagation()
          if (event.target === event.currentTarget && !updating) dialogRef.current.close()
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-bordo/15 text-bordo">
            <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" strokeWidth={1.8} /><path d="M3 21v-2a6 6 0 0112 0v2M17 10h5" strokeWidth={1.8} strokeLinecap="round" /></svg>
          </div>
          <h2 id={`${dialogId}-title`} className="break-words text-lg font-bold text-gray-900 dark:text-white">Unfollow {authorName}?</h2>
          <p id={`${dialogId}-description`} className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">Their posts will no longer appear in your Following feed. You can follow them again at any time.</p>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" autoFocus disabled={updating} onClick={() => dialogRef.current.close()} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Cancel</button>
            <button type="button" disabled={updating} onClick={updateFollow} className="rounded-xl bg-bordo px-4 py-2.5 text-sm font-bold text-green hover:bg-bordo-dark focus-visible:outline-bordo disabled:cursor-wait disabled:opacity-50">{updating ? 'Unfollowing…' : 'Unfollow'}</button>
          </div>
        </div>
      </dialog>
    )}
  </div>
}
