import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/api'
import AuthLayout from '../../layouts/AuthLayout'

// ── Animation helpers ──────────────────────────────────────────────────────
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors]               = useState({})
  const [loading, setLoading]             = useState(false)
  const [success, setSuccess]             = useState(false)
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm,  setShowConfirm]    = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const newErrors = {}
    if (!formData.name.trim())                                newErrors.name = 'Name is required.'
    if (!formData.email.trim())                               newErrors.email = 'Email is required.'
    if (formData.password.length < 8)                         newErrors.password = 'Password must be at least 8 characters.'
    if (formData.password !== formData.password_confirmation)  newErrors.password_confirmation = 'Passwords do not match.'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      return
    }

    try {
      await api.post('/register', formData)
      setSuccess(true)
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message })
      } else {
        setErrors({ general: 'Unable to connect to the server. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <motion.div
            className="w-20 h-20 bg-green rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <svg className="w-10 h-10 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h2 className="text-3xl font-bold text-bordo mb-3">Account Created!</h2>
          <p className="text-gray-400 mb-8 leading-relaxed text-sm">
            Your Tether account is ready. Sign in to start publishing.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3.5 px-6 bg-bordo text-cream rounded-xl font-bold text-sm tracking-wide hover:bg-bordo-dark transition-all duration-200 shadow-lg shadow-bordo/25"
          >
            Go to Login →
          </Link>
        </motion.div>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <motion.div variants={stagger} initial="hidden" animate="show">

        {/* Heading */}
        <motion.div variants={fadeUp} className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-bordo/60 mb-2">Get started</p>
          <h2 className="text-[2rem] font-extrabold leading-tight mb-1.5" style={{ color: '#18190F' }}>Create your account</h2>
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline transition-colors" style={{ color: '#E89951' }}>
              Sign in
            </Link>
          </p>
        </motion.div>

        {/* General error */}
        {errors.general && (
          <motion.div
            className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.general}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* Full Name */}
          <motion.div variants={fadeUp}>
            <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-4.5 h-4.5 ${errors.name ? 'text-red-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="name" name="name" type="text" autoComplete="name"
                value={formData.name} onChange={handleChange} placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-300 outline-none transition-all duration-200
                  focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20
                  ${errors.name ? 'border-red-300 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
              />
            </div>
            {errors.name && <ErrorMsg msg={errors.name} />}
          </motion.div>

          {/* Email */}
          <motion.div variants={fadeUp}>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-4.5 h-4.5 ${errors.email ? 'text-red-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={formData.email} onChange={handleChange} placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-300 outline-none transition-all duration-200
                  focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20
                  ${errors.email ? 'border-red-300 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
              />
            </div>
            {errors.email && <ErrorMsg msg={errors.email} />}
          </motion.div>

          {/* Password */}
          <motion.div variants={fadeUp}>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-4.5 h-4.5 ${errors.password ? 'text-red-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                id="password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" value={formData.password} onChange={handleChange}
                placeholder="Min. 8 characters"
                className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-300 outline-none transition-all duration-200
                  focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20
                  ${errors.password ? 'border-red-300 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
                aria-label="Toggle password visibility">
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password && <ErrorMsg msg={errors.password} />}
            {formData.password && <PasswordStrength password={formData.password} />}
          </motion.div>

          {/* Confirm Password */}
          <motion.div variants={fadeUp}>
            <label htmlFor="password_confirmation" className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-4.5 h-4.5 ${errors.password_confirmation ? 'text-red-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <input
                id="password_confirmation" name="password_confirmation"
                type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                value={formData.password_confirmation} onChange={handleChange}
                placeholder="Re-enter your password"
                className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-300 outline-none transition-all duration-200
                  focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20
                  ${errors.password_confirmation ? 'border-red-300 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
                aria-label="Toggle confirm password visibility">
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {errors.password_confirmation && <ErrorMsg msg={errors.password_confirmation} />}
          </motion.div>

          {/* Submit */}
          <motion.div variants={fadeUp} className="pt-1">
            <motion.button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{   scale: loading ? 1 : 0.975 }}
              className="w-full py-3.5 px-6 bg-bordo text-green rounded-xl font-bold text-sm tracking-wide
                hover:bg-bordo-dark transition-colors duration-200
                shadow-lg shadow-bordo/25 hover:shadow-bordo/40 hover:shadow-xl
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account…
                </>
              ) : 'Create Account →'}
            </motion.button>
          </motion.div>
        </form>

        <motion.p variants={fadeUp} className="mt-7 text-center text-xs text-gray-300">
          By signing up you agree to our{' '}
          <a href="#" className="text-gray-400 hover:text-bordo underline transition-colors">Terms</a>{' '}
          &amp;{' '}
          <a href="#" className="text-gray-400 hover:text-bordo underline transition-colors">Privacy Policy</a>.
        </motion.p>

      </motion.div>
    </AuthLayout>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ErrorMsg({ msg }) {
  return (
    <motion.p
      className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span>⚠</span>
      {Array.isArray(msg) ? msg[0] : msg}
    </motion.p>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function PasswordStrength({ password }) {
  const getScore = (pwd) => {
    let s = 0
    if (pwd.length >= 8)           s++
    if (pwd.length >= 12)          s++
    if (/[A-Z]/.test(pwd))         s++
    if (/[0-9]/.test(pwd))         s++
    if (/[^A-Za-z0-9]/.test(pwd))  s++
    return s
  }

  const score  = getScore(password)
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green', 'bg-green']
  const text   = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green', 'text-green']

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= score ? colors[score] : 'bg-gray-100'}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            style={{ originX: 0 }}
          />
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${text[score]}`}>{labels[score]}</p>
    </div>
  )
}
