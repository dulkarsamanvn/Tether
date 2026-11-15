import { defaultTimeZone, toDateTimeInput } from './scheduling.js'

const DATABASE = 'tether-editor'
const STORE = 'drafts'

function openDatabase() {
  return new Promise((resolve, reject) => {
    let blocked = false
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('userId', 'userId')
    }
    request.onsuccess = () => {
      if (blocked) request.result.close()
      else resolve(request.result)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => { blocked = true; reject(new Error('Draft storage is blocked.')) }
  })
}

async function transaction(mode, run) {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      let result
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('Draft storage was interrupted.'))
      run(tx.objectStore(STORE), (value) => { result = value })
    })
  } finally {
    db.close()
  }
}

export function listEditorDrafts(userId, blogId) {
  return transaction('readonly', (store, result) => {
    const request = store.index('userId').getAll(String(userId))
    request.onsuccess = () => result(selectEditorDrafts(request.result, userId, blogId))
  })
}

export function selectEditorDrafts(records, userId, blogId) {
  return records
    .filter((draft) => draft.userId === String(userId)
      && draft.blogId === (blogId ? String(blogId) : null)
      && draft.snapshot?.form && typeof draft.snapshot.content === 'string')
    .sort((a, b) => b.savedAt - a.savedAt)
}

export function writeEditorDraft(record) {
  return transaction('readwrite', (store) => { store.put(record) })
}

// A recovery copy may have changed in another tab since the prompt was opened.
export function removeEditorDraft(id, expectedSavedAt) {
  return transaction('readwrite', (store, result) => {
    const request = store.get(id)
    request.onsuccess = () => {
      if (request.result && expectedSavedAt !== undefined && request.result.savedAt !== expectedSavedAt) {
        result(false)
        return
      }
      store.delete(id)
      result(true)
    }
  })
}

export function snapshotKey(snapshot) {
  const { imageFile, ...fields } = snapshot
  return JSON.stringify({
    ...fields,
    imageFile: imageFile ? [imageFile.name, imageFile.size, imageFile.type, imageFile.lastModified] : null,
  })
}

export function blogSnapshot(blog = {}) {
  const timeZone = blog.scheduled_timezone ?? defaultTimeZone()
  return {
    form: {
      title: blog.title ?? '',
      excerpt: blog.excerpt ?? '',
      status: blog.status ?? 'draft',
      scheduled_for: toDateTimeInput(blog.scheduled_at, timeZone),
      schedule_timezone: timeZone,
      meta_title: blog.meta_title ?? '',
      meta_description: blog.meta_description ?? '',
      is_featured: blog.is_featured ?? false,
      allow_comments: blog.allow_comments ?? true,
    },
    content: blog.content ?? '',
    imageFile: null,
    existingImage: blog.featured_image ?? '',
    categoryIds: (blog.categories ?? []).map((category) => category.id),
    tagIds: (blog.tags ?? []).map((tag) => tag.id),
    newTagName: '',
  }
}

// Serialize writes: a slow save must never overwrite a more recent edit.
export function createAutosaver({ write, remove, onStatus, delay = 1000, maxDelay = 10_000 }) {
  let pending = null
  let active = null
  let timer = null
  let maxTimer = null
  let clearing = false

  const cancelTimer = () => {
    clearTimeout(timer)
    clearTimeout(maxTimer)
    timer = null
    maxTimer = null
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => { flush().catch(() => {}) }, delay)
    // Continuous typing still gets a recovery checkpoint at least every ten seconds.
    if (maxTimer === null) maxTimer = setTimeout(() => { flush().catch(() => {}) }, maxDelay)
  }

  const queue = (record) => {
    pending = record
    onStatus({ phase: 'pending' })
    schedule()
  }

  const flush = async () => {
    cancelTimer()
    if (clearing) return
    if (active) {
      await active
      return flush()
    }
    if (!pending) return
    const record = { ...pending, savedAt: Date.now() }
    const key = snapshotKey(record.snapshot)
    onStatus({ phase: 'saving' })
    active = Promise.resolve().then(() => write(record))
    try {
      await active
      if (pending && snapshotKey(pending.snapshot) === key) {
        pending = null
        onStatus({ phase: 'saved', savedAt: record.savedAt })
      }
    } catch (error) {
      onStatus({ phase: 'error' })
      throw error
    } finally {
      active = null
    }
    if (pending) return flush()
  }

  const clear = async (id) => {
    cancelTimer()
    clearing = true
    pending = null
    // Wait for any pending write before removing the completed recovery copy.
    if (active) await active.catch(() => {})
    try {
      await remove(id)
      onStatus({ phase: pending ? 'pending' : 'idle' })
    } finally {
      clearing = false
      if (pending) schedule()
    }
  }

  return { queue, flush, clear, isDirty: () => pending !== null }
}

