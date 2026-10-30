import { useId, useRef, useState } from 'react'

export default function BlogShare({ title, url }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const linkId = useId()
  const [copyStatus, setCopyStatus] = useState('idle')

  async function copyLink() {
    setCopyStatus('copying')
    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  const platforms = [
    { label: 'Twitter / X', href: `https://twitter.com/intent/tweet?${new URLSearchParams({ text: title, url })}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url })}` },
    { label: 'WhatsApp', href: `https://wa.me/?${new URLSearchParams({ text: `${title}\n${url}` })}` },
  ]
  const actionClass = 'block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo transition-colors'

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setCopyStatus('idle')
          dialogRef.current.showModal()
        }}
        className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold bg-bordo text-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo"
      >
        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="18" cy="5" r="3" strokeWidth={1.8} />
          <circle cx="6" cy="12" r="3" strokeWidth={1.8} />
          <circle cx="18" cy="19" r="3" strokeWidth={1.8} />
          <path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4" strokeWidth={1.8} />
        </svg>
        Share
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current.close()
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-lg font-bold text-gray-900 dark:text-white">Share this blog</h2>
            <button
              type="button"
              aria-label="Close share dialog"
              onClick={() => dialogRef.current.close()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-bordo dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="m6 6 12 12M6 18 18 6" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <label htmlFor={linkId} className="block text-sm font-medium text-gray-500 dark:text-gray-400">Blog link</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-800">
            <input
              id={linkId}
              type="text"
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-sm text-gray-700 focus:outline-bordo dark:text-gray-200"
            />
            <button
              type="button"
              onClick={copyLink}
              disabled={copyStatus === 'copying'}
              aria-label={copyStatus === 'copied' ? 'Link copied' : 'Copy link'}
              title={copyStatus === 'copied' ? 'Copied!' : 'Copy link'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bordo text-green hover:bg-bordo-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo disabled:opacity-60"
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                {copyStatus === 'copied' ? (
                  <path d="m5 12 4 4L19 6" />
                ) : (
                  <>
                    <rect x="8" y="8" width="12" height="12" rx="2" />
                    <path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <p role="status" aria-live="polite" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {copyStatus === 'copied' && 'Link copied to clipboard.'}
            {copyStatus === 'error' && 'Could not copy automatically. Select the blog link above and copy it manually.'}
          </p>
          <div className="mt-5 space-y-1 border-t border-gray-100 pt-3 dark:border-gray-800">
            {platforms.map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={actionClass}>
                {label}<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
      </dialog>
    </>
  )
}
