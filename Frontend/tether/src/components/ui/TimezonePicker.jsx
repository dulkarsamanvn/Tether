import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { timeZoneOptions } from '../../utils/scheduling'

const readable = (zone) => zone.replaceAll('_', ' ')
const searchable = (text) => readable(text).replaceAll('/', ' ').toLowerCase()

export default function TimezonePicker({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeZone, setActiveZone] = useState(value)
  const [placement, setPlacement] = useState({ above: false, maxHeight: 320 })
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)
  const panelId = useId()
  const listId = useId()
  const zones = useMemo(() => timeZoneOptions(value), [value])
  const filtered = useMemo(() => {
    const terms = searchable(query).trim().split(/\s+/).filter(Boolean)
    return zones.filter((zone) => terms.every((term) => searchable(zone).includes(term)))
  }, [query, zones])
  const activeIndex = Math.max(0, filtered.indexOf(activeZone))

  function openMenu() {
    setQuery('')
    setActiveZone(value)
    setOpen(true)
    searchRef.current?.focus({ preventScroll: true })
  }

  function closeMenu() {
    triggerRef.current?.focus({ preventScroll: true })
    setOpen(false)
  }

  function choose(zone) {
    closeMenu()
    onChange(zone)
  }

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useLayoutEffect(() => {
    if (!open || disabled) return

    function positionMenu() {
      const rect = rootRef.current.getBoundingClientRect()
      let top = 8
      let bottom = window.innerHeight - 8
      // Respect the dashboard's scrolling container as well as the viewport.
      for (let parent = rootRef.current.parentElement; parent; parent = parent.parentElement) {
        if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) continue
        const bounds = parent.getBoundingClientRect()
        top = Math.max(top, bounds.top + 8)
        bottom = Math.min(bottom, bounds.bottom - 8)
      }
      const below = Math.max(0, bottom - rect.bottom - 8)
      const above = Math.max(0, rect.top - top - 8)
      const useAbove = below < Math.min(320, above)
      setPlacement({ above: useAbove, maxHeight: Math.min(320, useAbove ? above : below) })
    }

    positionMenu()
    searchRef.current?.focus({ preventScroll: true })
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [open, disabled])

  useEffect(() => {
    if (!open) return
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, filtered])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (filtered[activeIndex]) choose(filtered[activeIndex])
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!filtered.length) return
      const next = (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length
      setActiveZone(filtered[next])
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative min-w-0"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          closeMenu()
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label="Publication timezone"
        aria-haspopup="dialog"
        aria-expanded={open && !disabled}
        aria-controls={open && !disabled ? panelId : undefined}
        title={readable(value)}
        onClick={() => { if (open) closeMenu(); else openMenu() }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            openMenu()
          }
        }}
        className={`flex w-full items-center gap-2.5 rounded-xl border bg-gray-50 px-3 py-2.5 text-left text-sm text-gray-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-white ${open ? 'border-bordo ring-2 ring-bordo/15' : 'border-gray-200 hover:border-bordo/60 dark:border-gray-700'}`}
      >
        <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth={1.6} />
          <path d="M3 12h18M12 3a17 17 0 010 18 17 17 0 010-18Z" strokeWidth={1.6} />
        </svg>
        <span className="min-w-0 flex-1 truncate">{readable(value).replaceAll('/', ' / ')}</span>
        <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose publication timezone"
          className={`absolute inset-x-0 z-50 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${placement.above ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ maxHeight: placement.maxHeight }}
        >
          <div className="shrink-0 border-b border-gray-100 p-2.5 dark:border-gray-800">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 dark:bg-gray-800">
              <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="10.5" cy="10.5" r="6.5" strokeWidth={1.8} /><path d="m16 16 4 4" strokeWidth={1.8} strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                role="combobox"
                aria-label="Search timezones"
                aria-expanded="true"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-activedescendant={filtered.length ? `${listId}-${activeIndex}` : undefined}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveZone(null) }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search city or timezone…"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 w-full bg-transparent py-2 text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              />
            </div>
          </div>

          <div ref={listRef} id={listId} role="listbox" aria-label="Timezones" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            {filtered.map((zone, index) => {
              const parts = readable(zone).split('/')
              const city = parts.pop()
              const region = parts.join(' / ') || 'Coordinated Universal Time'
              return (
                <button
                  key={zone}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={zone === value}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={(event) => { if (event.pointerType === 'mouse') setActiveZone(zone) }}
                  onClick={() => choose(zone)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${index === activeIndex ? 'bg-bordo/15' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} ${zone === value ? 'text-bordo-dark dark:text-bordo' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{city}</span>
                    <span className="block truncate text-[10px] text-gray-400 dark:text-gray-500">{region}</span>
                  </span>
                  {zone === value && <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-bordo" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
              )
            })}
          </div>
          {filtered.length === 0 && <p className="px-4 py-5 text-center text-xs text-gray-500 dark:text-gray-400">No timezones found. Try another city or region.</p>}
          <p role="status" className="shrink-0 border-t border-gray-100 px-3 py-2 text-[10px] text-gray-400 dark:border-gray-800 dark:text-gray-500">
            {filtered.length} timezone{filtered.length === 1 ? '' : 's'} · ↑ ↓ to move · Enter to select
          </p>
        </div>
      )}
    </div>
  )
}
