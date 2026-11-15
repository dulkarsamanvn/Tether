import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scheduleToUtc, timeZoneOptions, toDateTimeInput } from '../src/utils/scheduling.js'
import { blogSnapshot, createAutosaver } from '../src/utils/editorDrafts.js'

test('publication times are converted from the selected timezone to UTC', () => {
  assert.equal(scheduleToUtc('2030-01-05T15:00', 'Asia/Kolkata'), '2030-01-05T09:30:00.000Z')
  assert.equal(scheduleToUtc('2030-01-05T15:00', 'Asia/Kathmandu'), '2030-01-05T09:15:00.000Z')
  assert.equal(scheduleToUtc('2030-01-05T15:00', 'UTC'), '2030-01-05T15:00:00.000Z')
})

test('loaded schedules display the original wall time, including dates crossing midnight', () => {
  assert.equal(toDateTimeInput('2030-01-05T21:00:00Z', 'Asia/Kolkata'), '2030-01-06T02:30')
  assert.equal(toDateTimeInput('2030-01-05T21:00:00Z', 'America/New_York'), '2030-01-05T16:00')
})

test('daylight-saving offsets are determined for the publication date', () => {
  assert.equal(scheduleToUtc('2030-01-15T12:00', 'America/New_York'), '2030-01-15T17:00:00.000Z')
  assert.equal(scheduleToUtc('2030-07-15T12:00', 'America/New_York'), '2030-07-15T16:00:00.000Z')
})

test('nonexistent and ambiguous daylight-saving times require an explicit correction', () => {
  assert.throws(() => scheduleToUtc('2030-03-10T02:30', 'America/New_York'), /does not exist/)
  assert.throws(() => scheduleToUtc('2030-11-03T01:30', 'America/New_York'), /occurs twice/)
})

test('missing and invalid calendar dates are rejected', () => {
  assert.throws(() => scheduleToUtc('', 'UTC'), /Choose a publication/)
  assert.throws(() => scheduleToUtc('2030-02-30T12:00', 'UTC'), /valid publication/)
  assert.throws(() => scheduleToUtc('2030-01-05T25:00', 'UTC'), /valid publication/)
})

test('the selected timezone and UTC are always available in the picker', () => {
  const zones = timeZoneOptions('Asia/Calcutta')
  assert.ok(zones.includes('UTC'))
  assert.ok(zones.includes('Asia/Calcutta'))
  assert.equal(new Set(zones).size, zones.length)
})

test('autosave and recovery preserve a scheduled publication time and timezone', async () => {
  const snapshot = blogSnapshot({
    title: 'Scheduled writing', status: 'scheduled',
    scheduled_at: '2030-01-05T09:30:00Z', scheduled_timezone: 'Asia/Kolkata',
  })
  let recovered
  const saver = createAutosaver({ write: async (record) => { recovered = record.snapshot }, remove: async () => {}, onStatus: () => {} })
  saver.queue({ id: 'scheduled-draft', snapshot })
  await saver.flush()
  assert.equal(recovered.form.scheduled_for, '2030-01-05T15:00')
  assert.equal(recovered.form.schedule_timezone, 'Asia/Kolkata')
})
