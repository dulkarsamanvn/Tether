import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request interceptor ────────────────────────────────────────────────────
// Reads token from localStorage and attaches it before every request.
// This means: as soon as login() saves the token, every subsequent call
// will automatically include "Authorization: Bearer <token>".
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ───────────────────────────────────────────────────
// Catches 401 Unauthorized (expired / invalid token) globally.
// Clears localStorage and redirects to /login automatically.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
