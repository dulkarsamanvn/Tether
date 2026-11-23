const DAY = 86400000

export function analyticsRange(days = 30, now = new Date()) {
  const end = new Date(now)
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) }
}

export function validateAnalyticsRange(start, end, today = analyticsRange(1).end_date) {
  const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  if (!valid(start) || !valid(end)) return 'Choose a valid start and end date.'
  if (start > end) return 'The start date must be on or before the end date.'
  if (end > today) return 'The end date cannot be in the future (UTC).'
  if ((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY >= 366) return 'Choose a date range of 366 days or fewer.'
  return null
}

export function analyticsChange(current, previous) {
  if (current === previous) return { text: 'No change', direction: 'neutral' }
  if (previous === 0) return { text: 'New activity', direction: 'up' }
  const percentage = Math.round(Math.abs(current - previous) / previous * 1000) / 10
  return { text: `${current > previous ? '+' : '−'}${percentage}%`, direction: current > previous ? 'up' : 'down' }
}

export function analyticsDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' })
}
