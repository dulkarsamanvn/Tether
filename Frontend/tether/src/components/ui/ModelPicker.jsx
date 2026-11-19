import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'

export default function ModelPicker({ models, value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(value)
  const [placement, setPlacement] = useState({ above: false, maxHeight: 320 })
  const root = useRef(null), trigger = useRef(null), search = useRef(null), list = useRef(null)
  const panelId = useId(), listId = useId()
  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    return models.filter((model) => terms.every((term) => `${model.name} ${model.id}`.toLowerCase().includes(term)))
  }, [models, query])
  const activeIndex = Math.max(0, filtered.findIndex((model) => model.id === active))
  const visible = open && !disabled

  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }) }
  function choose(id) { onChange(id); close() }
  function show() { setQuery(''); setActive(value); setOpen(true) }

  useLayoutEffect(() => {
    if (!visible) return
    function position() {
      const rect = root.current.getBoundingClientRect()
      let top = 8, bottom = window.innerHeight - 8
      for (let parent = root.current.parentElement; parent; parent = parent.parentElement) {
        if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) continue
        const bounds = parent.getBoundingClientRect()
        top = Math.max(top, bounds.top + 8); bottom = Math.min(bottom, bounds.bottom - 8)
      }
      const below = Math.max(0, bottom - rect.bottom - 8), above = Math.max(0, rect.top - top - 8)
      const useAbove = below < Math.min(320, above)
      setPlacement({ above: useAbove, maxHeight: Math.min(320, useAbove ? above : below) })
    }
    position(); search.current?.focus({ preventScroll: true })
    window.addEventListener('resize', position); window.addEventListener('scroll', position, true)
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true) }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    list.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [visible, activeIndex, filtered])

  useEffect(() => {
    if (!visible) return
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [visible])

  return <div ref={root} className="relative min-w-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={(event) => {
    if (visible && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  }}>
    <button ref={trigger} type="button" disabled={disabled} aria-label="Model ID" aria-haspopup="dialog" aria-expanded={visible} aria-controls={visible ? panelId : undefined}
      onClick={() => { if (visible) close(); else show() }} onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); show() } }}
      className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm text-gray-900 focus-visible:outline-bordo disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
      <span className="min-w-0 truncate font-mono">{value || 'Choose a model'}</span>
      <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-gray-400 ${visible ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {visible && <div id={panelId} role="dialog" aria-label="Choose a model" className={`absolute inset-x-0 z-50 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${placement.above ? 'bottom-full mb-2' : 'top-full mt-2'}`} style={{ maxHeight: placement.maxHeight }}>
      <div className="shrink-0 border-b border-gray-100 p-2.5 dark:border-gray-800">
        <input ref={search} type="search" role="combobox" aria-label="Search models" aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={filtered.length ? `${listId}-${activeIndex}` : undefined} autoComplete="off" placeholder="Search model name or ID…" value={query}
          onChange={(event) => { setQuery(event.target.value); setActive('') }} onKeyDown={(event) => {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              if (!filtered.length) return
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? filtered.length - 1 : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length
              setActive(filtered[next].id)
            } else if (event.key === 'Enter') { event.preventDefault(); if (filtered[activeIndex]) choose(filtered[activeIndex].id) }
          }} className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-bordo/40 dark:bg-gray-800 dark:text-white" />
      </div>
      <ul ref={list} id={listId} role="listbox" aria-label="Available models" className="min-h-0 overflow-y-auto overscroll-contain p-1">
        {filtered.map((model, index) => <li key={model.id} id={`${listId}-${index}`} role="option" aria-selected={value === model.id} onPointerDown={(event) => event.preventDefault()} onPointerMove={() => setActive(model.id)} onClick={() => choose(model.id)} className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm ${index === activeIndex ? 'bg-bordo/15 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
          <span className="block break-words font-semibold">{model.name}</span>{model.name !== model.id && <span className="mt-0.5 block break-all font-mono text-xs text-gray-500 dark:text-gray-400">{model.id}</span>}
        </li>)}
      </ul>
      {!filtered.length && <p role="status" className="p-4 text-sm text-gray-500 dark:text-gray-400">No matching models. Try another search or enter an ID manually.</p>}
      <p className="shrink-0 border-t border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">{filtered.length} {filtered.length === 1 ? 'model' : 'models'}</p>
    </div>}
  </div>
}
