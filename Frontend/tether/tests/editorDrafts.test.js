import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blogSnapshot, createAutosaver, selectEditorDrafts, snapshotKey } from '../src/utils/editorDrafts.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function record(title, overrides = {}) {
  return {
    id: 'session-1', userId: '1', blogId: '12', savedAt: 1,
    snapshot: blogSnapshot({ title, content: `<p>${title}</p>`, status: 'published' }),
    ...overrides,
  }
}

function harness(overrides = {}) {
  const records = new Map()
  const statuses = []
  const autosaver = createAutosaver({
    write: async (value) => records.set(value.id, value),
    remove: async (id) => records.delete(id),
    onStatus: (value) => statuses.push(value),
    delay: 60_000,
    ...overrides,
  })
  return { autosaver, records, statuses }
}

test('typing is debounced and only the latest complete snapshot is saved', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { autosaver, records, statuses } = harness({ delay: 1000 })
  autosaver.queue(record('First keystroke'))
  t.mock.timers.tick(900)
  autosaver.queue(record('Latest writing'))
  t.mock.timers.tick(999)
  assert.equal(records.size, 0)
  t.mock.timers.tick(1)
  await autosaver.flush()
  assert.equal(records.get('session-1').snapshot.form.title, 'Latest writing')
  assert.equal(autosaver.isDirty(), false)
  assert.equal(statuses.at(-1).phase, 'saved')
  assert.ok(statuses.at(-1).savedAt > 0)
})

test('edits during a slow save are written afterwards and never replaced by the old snapshot', async () => {
  const firstWrite = deferred()
  const writes = []
  let lastRecord
  const { autosaver, statuses } = harness({
    write: async (value) => {
      writes.push(value.snapshot.form.title)
      if (writes.length === 1) await firstWrite.promise
      lastRecord = value
    },
  })
  autosaver.queue(record('Old text'))
  const saving = autosaver.flush()
  await Promise.resolve()
  autosaver.queue(record('New text'))
  firstWrite.resolve()
  await saving
  assert.deepEqual(writes, ['Old text', 'New text'])
  assert.equal(lastRecord.snapshot.content, '<p>New text</p>')
  assert.equal(statuses.filter((value) => value.phase === 'saved').length, 1)
  assert.equal(autosaver.isDirty(), false)
})

test('continuous typing gets a recovery checkpoint without waiting for a pause', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { autosaver, records, statuses } = harness({ delay: 1000, maxDelay: 10_000 })
  for (let i = 0; i < 20; i++) {
    autosaver.queue(record(`Writing ${i}`))
    t.mock.timers.tick(500)
  }
  assert.equal(statuses.at(-1).phase, 'saving')
  await autosaver.flush()
  assert.equal(records.get('session-1').snapshot.form.title, 'Writing 19')
})

test('storage failure preserves pending writing and a retry saves it', async () => {
  let fail = true
  let saved
  const { autosaver, statuses } = harness({
    write: async (value) => {
      if (fail) throw new Error('Quota exceeded')
      saved = value
    },
  })
  autosaver.queue(record('Do not lose this'))
  await assert.rejects(autosaver.flush(), /Quota exceeded/)
  assert.equal(autosaver.isDirty(), true)
  assert.equal(statuses.at(-1).phase, 'error')
  fail = false
  await autosaver.flush()
  assert.equal(saved.snapshot.form.title, 'Do not lose this')
  assert.equal(autosaver.isDirty(), false)
})

test('synchronous storage errors also leave a retryable recovery copy', async () => {
  const { autosaver, statuses } = harness({ write: () => { throw new Error('Storage disabled') } })
  autosaver.queue(record('Important writing'))
  await assert.rejects(autosaver.flush(), /Storage disabled/)
  assert.equal(autosaver.isDirty(), true)
  assert.equal(statuses.at(-1).phase, 'error')
  // Cancels the timer without attempting another write.
  await autosaver.clear('session-1')
})

test('committing waits for an active save and removes the copy without a late write resurrecting it', async () => {
  const firstWrite = deferred()
  const records = new Map()
  const writes = []
  const { autosaver } = harness({
    write: async (value) => {
      writes.push(value.snapshot.form.title)
      await firstWrite.promise
      records.set(value.id, value)
    },
    remove: async (id) => records.delete(id),
  })
  autosaver.queue(record('Writing'))
  const saving = autosaver.flush()
  await Promise.resolve()
  autosaver.queue(record('The committed version'))
  const committing = autosaver.clear('session-1')
  firstWrite.resolve()
  await Promise.all([saving, committing])
  assert.equal(records.size, 0)
  assert.deepEqual(writes, ['Writing'])
  assert.equal(autosaver.isDirty(), false)
})

test('flushing on navigation saves immediately without waiting for the typing delay', async () => {
  const { autosaver, records } = harness()
  autosaver.queue(record('Leaving the editor'))
  assert.equal(records.size, 0)
  await autosaver.flush()
  assert.equal(records.get('session-1').snapshot.form.title, 'Leaving the editor')
})

test('recovery includes incomplete writing, cover files, organization, and settings', async () => {
  const { autosaver, records } = harness()
  const snapshot = {
    ...blogSnapshot(),
    content: '<p>Unfinished story</p>',
    categoryIds: [2, 5], tagIds: [9], newTagName: 'unfinished tag',
    imageFile: new File(['cover bytes'], 'cover.png', { type: 'image/png', lastModified: 123 }),
  }
  snapshot.form.meta_title = 'SEO title'
  snapshot.form.allow_comments = false
  autosaver.queue(record('', { snapshot }))
  await autosaver.flush()
  const recovered = records.get('session-1').snapshot
  assert.equal(recovered.form.title, '')
  assert.equal(recovered.content, '<p>Unfinished story</p>')
  assert.deepEqual(recovered.categoryIds, [2, 5])
  assert.deepEqual(recovered.tagIds, [9])
  assert.equal(recovered.newTagName, 'unfinished tag')
  assert.equal(recovered.form.meta_title, 'SEO title')
  assert.equal(recovered.form.allow_comments, false)
  assert.equal(await recovered.imageFile.text(), 'cover bytes')
  assert.equal(recovered.imageFile.name, 'cover.png')
})

test('recovery choices are scoped to the signed-in account and post, newest first', () => {
  const first = record('Older', { savedAt: 10 })
  const second = record('Newer', { id: 'session-2', savedAt: 20 })
  const records = [
    first, second,
    record('Another account', { userId: '2' }),
    record('Another post', { blogId: '13' }),
    record('A new post', { blogId: null }),
    record('Corrupt copy', { snapshot: null }),
  ]
  assert.deepEqual(selectEditorDrafts(records, 1, 12).map((item) => item.snapshot.form.title), ['Newer', 'Older'])
  assert.deepEqual(selectEditorDrafts(records, 1, null).map((item) => item.snapshot.form.title), ['A new post'])
  assert.equal(selectEditorDrafts(records, 3, 12).length, 0)
})

test('separate editor sessions do not overwrite or clear each other', async () => {
  const { autosaver, records } = harness()
  records.set('another-session', record('Other writing', { id: 'another-session' }))
  autosaver.queue(record('My writing'))
  await autosaver.flush()
  await autosaver.clear('session-1')
  assert.equal(records.size, 1)
  assert.equal(records.get('another-session').snapshot.form.title, 'Other writing')
})

test('changing or removing a cover image changes the saved snapshot', () => {
  const original = blogSnapshot({ featured_image: 'blogs/original.png' })
  const selected = { ...original, imageFile: new File(['new'], 'new.png', { lastModified: 123 }) }
  const removed = { ...original, existingImage: '' }
  assert.notEqual(snapshotKey(original), snapshotKey(selected))
  assert.notEqual(snapshotKey(original), snapshotKey(removed))
})
