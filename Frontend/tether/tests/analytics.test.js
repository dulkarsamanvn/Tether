import test from 'node:test'
import assert from 'node:assert/strict'
import { analyticsRange, validateAnalyticsRange, analyticsChange } from '../src/utils/analytics.js'

test('analytics presets use UTC dates across month, year, and timezone boundaries', () => {
  assert.deepEqual(analyticsRange(7, new Date('2026-01-03T01:00:00+05:30')), { start_date: '2025-12-27', end_date: '2026-01-02' })
  assert.deepEqual(analyticsRange(30, new Date('2024-03-01T23:00:00Z')), { start_date: '2024-02-01', end_date: '2024-03-01' })
  assert.deepEqual(analyticsRange(1, new Date('2026-11-23T23:59:59Z')), { start_date: '2026-11-23', end_date: '2026-11-23' })
})

test('custom analytics dates reject rollovers, reversed ranges, and future dates', () => {
  const today = '2026-11-23'
  for (const [start, end] of [['', today], ['2026-02-30', '2026-03-01'], ['2026-11-24', today], [today, '2026-11-24'], ['2026-1-1', today]]) {
    assert.ok(validateAnalyticsRange(start, end, today))
  }
  assert.equal(validateAnalyticsRange(today, today, today), null)
})

test('custom analytics ranges enforce the inclusive 366 day limit', () => {
  assert.equal(validateAnalyticsRange('2025-11-23', '2026-11-23', '2026-11-23'), null)
  assert.ok(validateAnalyticsRange('2025-11-22', '2026-11-23', '2026-11-23'))
})

test('analytics comparisons handle zero baselines without infinity or misleading percentages', () => {
  assert.deepEqual(analyticsChange(0, 0), { text: 'No change', direction: 'neutral' })
  assert.deepEqual(analyticsChange(3, 0), { text: 'New activity', direction: 'up' })
  assert.deepEqual(analyticsChange(0, 3), { text: '−100%', direction: 'down' })
  assert.deepEqual(analyticsChange(4, 3), { text: '+33.3%', direction: 'up' })
})
