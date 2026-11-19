import { useEffect, useState } from 'react'

export default function FlashMessage({ message, onDismiss, variant = 'success', className = '' }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const isError = variant === 'error'
  const duration = isError ? 8000 : 5000

  useEffect(() => {
    if (hovered || focused) return
    const timer = setTimeout(() => onDismiss(null), duration)
    return () => clearTimeout(timer)
  }, [message, onDismiss, duration, hovered, focused])

  return <div role={isError ? 'alert' : 'status'} aria-label={isError ? 'Error message' : 'Success message'}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}
    className={`flex items-start gap-3 rounded-xl p-4 text-sm ${isError ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' : 'bg-sage/15 text-gray-700 dark:text-gray-300'} ${className}`}>
    <span className="min-w-0 flex-1 break-words">{message}</span>
    <button type="button" aria-label={`Dismiss ${isError ? 'error' : 'success'} message`} onClick={() => onDismiss(null)}
      className="-m-1 shrink-0 rounded-lg p-1 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo dark:hover:bg-white/10">
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" strokeWidth={1.8} strokeLinecap="round" /></svg>
    </button>
  </div>
}
