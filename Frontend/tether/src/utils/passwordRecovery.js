export function readResetLink({ hash = '', search = '' }) {
  const parameters = new URLSearchParams(hash ? hash.slice(1) : search)
  const token = parameters.get('token') ?? ''
  const email = parameters.get('email') ?? ''
  if (parameters.getAll('token').length !== 1 || parameters.getAll('email').length !== 1
    || token.length !== 64 || !/^[a-f0-9]{64}$/.test(token) || email.length > 255 || email !== email.trim()
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return { token, email }
}

export function validateNewPassword(password, confirmation) {
  if ([...password].length < 8) return 'Use at least 8 characters.'
  if (new TextEncoder().encode(password).length > 72) return 'Choose a shorter password (up to 72 bytes).'
  if (password !== confirmation) return 'The passwords do not match.'
  return ''
}

export function retrySeconds(error, fallback = 60) {
  const value = error.response?.headers?.['retry-after']
  if (value == null) return fallback
  const seconds = /^\d+$/.test(String(value)) ? Number(value) : Math.ceil((Date.parse(value) - Date.now()) / 1000)
  return Number.isFinite(seconds) ? Math.max(1, Math.min(86400, seconds)) : fallback
}

export function firstError(value) {
  return Array.isArray(value) ? value[0] : value
}
