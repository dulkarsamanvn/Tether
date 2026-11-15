export function defaultTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function timeZoneOptions(selected = defaultTimeZone()) {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return [...new Set(['UTC', selected, ...zones])].sort()
}

function dateFormatter(timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
}

function wallTime(date, formatter) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function toDateTimeInput(instant, timeZone = defaultTimeZone()) {
  return instant ? wallTime(new Date(instant), dateFormatter(timeZone)) : ''
}

// Interpret the selected wall-clock time in its chosen zone, independently of
// the device timezone. Reject nonexistent or ambiguous daylight-saving times.
export function scheduleToUtc(value, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value ?? '')
  if (!match) throw new Error('Choose a publication date and time.')
  const [, year, month, day, hour, minute] = match.map(Number)
  const wallMs = Date.UTC(year, month - 1, day, hour, minute)
  if (new Date(wallMs).toISOString().slice(0, 16) !== value) throw new Error('Choose a valid publication date and time.')
  const formatter = dateFormatter(timeZone)
  const offsets = new Set()
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const instant = wallMs + hours * 3_600_000
    const local = wallTime(new Date(instant), formatter)
    offsets.add(Date.parse(`${local}:00Z`) - instant)
  }
  const candidates = [...offsets]
    .map((offset) => wallMs - offset)
    .filter((instant) => wallTime(new Date(instant), formatter) === value)
  if (candidates.length === 0) throw new Error('This time does not exist in the selected timezone. Choose a different time.')
  if (candidates.length > 1) throw new Error('This time occurs twice in the selected timezone. Choose a different time or use UTC.')
  return new Date(candidates[0]).toISOString()
}

export function formatScheduledTime(instant, timeZone = defaultTimeZone()) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone, year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(instant))
}
