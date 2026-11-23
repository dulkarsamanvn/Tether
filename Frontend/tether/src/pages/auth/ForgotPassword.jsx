import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/api'
import useRecoveryRequest from '../../hooks/useRecoveryRequest'
import AuthLayout from '../../layouts/AuthLayout'
import { firstError, retrySeconds } from '../../utils/passwordRecovery'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { loading, cooldown, start, finish, wait } = useRecoveryRequest()

  const submit = async (event) => {
    event.preventDefault()
    if (loading || cooldown) return
    setError('')
    setMessage('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    const controller = start()
    try {
      const { data } = await api.post('/forgot-password', { email: email.trim() }, { signal: controller.signal })
      if (controller.signal.aborted) return
      setMessage(data.message)
      wait(Number(data.resend_after) || 60)
    } catch (failure) {
      if (controller.signal.aborted) return
      if (failure.response?.status === 429) {
        wait(retrySeconds(failure))
        setError('Too many requests. Please wait before trying again.')
      } else {
        setError(firstError(failure.response?.data?.errors?.email)
          || 'We could not request a reset link. Please try again.')
      }
    } finally {
      finish(controller)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-bordo/60 mb-2">Account recovery</p>
        <h2 className="text-[2rem] font-extrabold leading-tight mb-3">Forgot your password?</h2>
        <p className="text-sm text-gray-400 leading-relaxed">Enter your account email and we will send you a link to choose a new password.</p>
      </div>
      {message && (
        <div role="status" className="mb-5 rounded-xl border border-sage/30 bg-sage/10 px-4 py-4 text-sm text-gray-600 leading-relaxed">
          <p className="font-semibold mb-1">Check your inbox</p>
          <p>{message}</p>
          <p className="mt-2">Check your spam folder too. The link expires in 60 minutes.</p>
        </div>
      )}
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <label htmlFor="recovery-email" className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Email address</label>
          <input id="recovery-email" name="email" type="email" autoComplete="email"
            value={email} disabled={loading} maxLength={255}
            onChange={(event) => { setEmail(event.target.value); setError(''); setMessage('') }}
            placeholder="you@example.com" aria-invalid={!!error} aria-describedby={error ? 'recovery-error' : undefined}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-sm bg-gray-50 text-gray-900 outline-none focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20 disabled:opacity-60" />
        </div>
        {error && <p id="recovery-error" role="alert" className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading || cooldown > 0}
          className="w-full py-3.5 px-6 bg-bordo text-cream rounded-xl font-bold text-sm hover:bg-bordo-dark transition-colors shadow-lg shadow-bordo/20 disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? 'Sending link…' : cooldown ? `Try again in ${cooldown}s` : message ? 'Send another link' : 'Send reset link'}
        </button>
      </form>
      <Link to="/login" className="mt-7 block text-center text-sm text-gray-500 hover:text-bordo font-semibold">← Back to sign in</Link>
    </AuthLayout>
  )
}
