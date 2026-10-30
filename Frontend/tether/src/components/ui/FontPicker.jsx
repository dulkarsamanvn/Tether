import { useEffect, useId, useRef, useState } from 'react'
import { useFont } from '../../hooks/useFont'
import { FONTS, getFont } from '../../utils/fonts'

export default function FontPicker() {
  const { font, setFont, loading, error } = useFont()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const selectedFont = getFont(font)

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector('[aria-checked="true"]')?.focus()

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        triggerRef.current?.focus()
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function chooseFont(id) {
    triggerRef.current?.focus()
    setOpen(false)
    setFont(id)
  }

  function handleMenuKeyDown(event) {
    if (event.key === 'Tab') {
      triggerRef.current?.focus()
      setOpen(false)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const options = Array.from(menuRef.current.querySelectorAll('[role="menuitemradio"]'))
    const index = options.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
    options[next]?.focus()
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Choose font. Current font: ${selectedFont.name}`}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-busy={loading}
        aria-disabled={loading}
        title={loading ? 'Loading font...' : `Font: ${selectedFont.name}`}
        onClick={() => { if (!loading) setOpen((value) => !value) }}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo aria-disabled:cursor-wait aria-disabled:opacity-60 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <span aria-hidden="true" className="text-base font-bold leading-none">Aa</span>
      </button>
      <span role="status" className="sr-only">{loading ? 'Loading font...' : `Current font: ${selectedFont.name}`}</span>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-100 bg-white p-3 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <p className="px-2 pt-1 text-sm font-bold text-gray-900 dark:text-white">Choose font</p>
          <p className="px-2 pt-1 pb-3 text-xs text-gray-500 dark:text-gray-400">Current: {selectedFont.name}</p>
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Choose font"
            onKeyDown={handleMenuKeyDown}
            className="max-h-[min(24rem,calc(100dvh-12rem))] space-y-1 overflow-y-auto px-1 py-1"
          >
            {FONTS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={font === option.id}
                tabIndex={font === option.id ? 0 : -1}
                data-font={option.id}
                onClick={() => chooseFont(option.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-bordo ${font === option.id
                  ? 'bg-bordo/15 text-green dark:text-bordo'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {font === option.id && (
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="m5 12 4 4L19 6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="flex-1">{option.name}</span>
                {option.id === 'poppins' && <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">Default</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && !open && (
        <p role="alert" className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-red-200 bg-white p-3 text-xs text-red-600 shadow-lg dark:border-red-900 dark:bg-gray-900 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
