import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'
import useRecoveryRequest from '../../hooks/useRecoveryRequest'
import AuthLayout from '../../layouts/AuthLayout'
import { firstError, readResetLink, retrySeconds, validateNewPassword } from '../../utils/passwordRecovery'

export default function ResetPassword() {
  const location = useLocation()
  // A new link gets fresh form state and cancels any request from the previous one.
  return <ResetPasswordForm key={location.key} link={readResetLink(location)} />
}

function ResetPasswordForm({ link }) {
  const navigate = useNavigate()
  const { logoutForEmail } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState(!link)
  const { loading, cooldown, start, finish, wait } = useRecoveryRequest()

  const submit = async (event) => {
    event.preventDefault()
    if (loading || cooldown || invalid) return
    const validation = validateNewPassword(password, confirmation)
    setError(validation)
    if (validation) return
    const controller = start()
    try {
      await api.post('/reset-password', { ...link, password, password_confirmation: confirmation }, { signal: controller.signal })
      if (controller.signal.aborted) return
      logoutForEmail(link.email)
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch (failure) {
      if (controller.signal.aborted) return
      const data = failure.response?.data
      if (data?.code === 'password_reset_invalid' || data?.errors?.token || data?.errors?.email) {
        setInvalid(true)
        setPassword('')
        setConfirmation('')
      } else if (failure.response?.status === 429) {
        wait(retrySeconds(failure))
        setError('Too many attempts. Please wait before trying again.')
      } else {
        setError(firstError(data?.errors?.password) || 'We could not reset your password. Please try again.')
      }
    } finally {
      finish(controller)
    }
  }

  return (
    <AuthLayout>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-bordo/60 mb-2">Account recovery</p>
      <h2 className="text-[2rem] font-extrabold leading-tight mb-3">{invalid ? 'Request a new link' : 'Choose a new password'}</h2>
      {invalid ? (
        <div>
          <p role="alert" className="text-sm text-gray-500 leading-relaxed mb-7">This reset link is invalid or has expired. Request a new one to reset your password.</p>
          <Link to="/forgot-password" className="block text-center py-3.5 px-6 bg-bordo text-cream rounded-xl font-bold text-sm hover:bg-bordo-dark">Request reset link</Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 leading-relaxed mb-7">Reset the password for
            <span className="mt-1 block font-semibold text-gray-600 break-all">{link.email}</span>
          </p>
          <form onSubmit={submit} noValidate className="space-y-5">
            <p id="password-help" className="text-xs text-gray-400">Use at least 8 characters. After resetting, sign in again on your devices.</p>
            <div>
              <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">New password</label>
              <input id="new-password" name="password" type={visible ? 'text' : 'password'} autoComplete="new-password"
                value={password} disabled={loading} onChange={(event) => { setPassword(event.target.value); setError('') }}
                aria-describedby={error ? 'password-help reset-error' : 'password-help'} aria-invalid={!!error}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-sm bg-gray-50 text-gray-900 outline-none focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20 disabled:opacity-60" />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Confirm new password</label>
              <input id="confirm-password" name="password_confirmation" type={visible ? 'text' : 'password'} autoComplete="new-password"
                value={confirmation} disabled={loading} onChange={(event) => { setConfirmation(event.target.value); setError('') }}
                aria-describedby={error ? 'reset-error' : undefined} aria-invalid={!!error}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-sm bg-gray-50 text-gray-900 outline-none focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20 disabled:opacity-60" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} className="accent-bordo" /> Show passwords
            </label>
            {error && <p id="reset-error" role="alert" className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading || cooldown > 0}
              className="w-full py-3.5 px-6 bg-bordo text-cream rounded-xl font-bold text-sm hover:bg-bordo-dark transition-colors shadow-lg shadow-bordo/20 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Resetting password…' : cooldown ? `Try again in ${cooldown}s` : 'Reset password'}
            </button>
          </form>
        </>
      )}
      <Link to="/login" className="mt-7 block text-center text-sm text-gray-500 hover:text-bordo font-semibold">← Back to sign in</Link>
    </AuthLayout>
  )
}
