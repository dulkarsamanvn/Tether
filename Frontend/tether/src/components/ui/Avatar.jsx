import { useState } from 'react'

export default function Avatar({ user, className = 'h-10 w-10 text-sm' }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const url = user?.avatar_url
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bordo/20 font-bold text-green dark:text-bordo ${className}`}>
      {url && failedUrl !== url
        ? <img src={url} alt="" onError={() => setFailedUrl(url)} className="h-full w-full object-cover" />
        : (user?.name?.trim()?.[0] ?? 'A').toUpperCase()}
    </span>
  )
}
