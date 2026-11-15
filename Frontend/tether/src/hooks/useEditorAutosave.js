import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { createAutosaver, removeEditorDraft, snapshotKey, writeEditorDraft } from '../utils/editorDrafts'

export function useEditorAutosave({ userId, blogId, snapshot, baseline, enabled }) {
  const [status, setStatus] = useState({ phase: 'idle' })
  const [draftId] = useState(() => crypto.randomUUID())
  const [autosaver] = useState(() => createAutosaver({
    write: writeEditorDraft,
    remove: removeEditorDraft,
    onStatus: (next) => setStatus((previous) => ({ ...previous, ...next })),
  }))
  const lastQueued = useRef(null)
  const key = snapshotKey(snapshot)
  const shouldBlock = useCallback(({ currentLocation, nextLocation }) => autosaver.isDirty()
    && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search), [autosaver])
  const navigation = useBlocker(shouldBlock)

  const record = (value) => ({
    id: draftId,
    userId: String(userId),
    blogId: blogId ? String(blogId) : null,
    snapshot: value,
    savedAt: Date.now(),
  })

  useLayoutEffect(() => {
    if (!enabled || baseline === null) return
    if (lastQueued.current === null) lastQueued.current = baseline
    if (key === lastQueued.current) return
    lastQueued.current = key
    autosaver.queue({
      id: draftId,
      userId: String(userId),
      blogId: blogId ? String(blogId) : null,
      snapshot,
      savedAt: Date.now(),
    })
  }, [autosaver, baseline, blogId, draftId, enabled, key, snapshot, userId])

  useEffect(() => {
    if (navigation.state !== 'blocked') return
    let cancelled = false
    autosaver.flush()
      .then(() => { if (!cancelled) navigation.proceed() })
      .catch(() => { /* Keep navigation blocked so the author can retry or stay. */ })
    return () => { cancelled = true }
  }, [autosaver, navigation])

  useEffect(() => {
    const flush = () => { autosaver.flush().catch(() => {}) }
    const beforeUnload = (event) => {
      if (!autosaver.isDirty()) return
      flush()
      event.preventDefault()
      event.returnValue = ''
    }
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flush()
    }
  }, [autosaver])

  return {
    status,
    navigation,
    async saveNow(value = snapshot) {
      lastQueued.current = snapshotKey(value)
      autosaver.queue(record(value))
      await autosaver.flush()
    },
    async markCommitted(value) {
      lastQueued.current = snapshotKey(value)
      await autosaver.clear(draftId)
    },
    flush: autosaver.flush,
  }
}
