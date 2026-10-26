import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'
import AuthLayout from '../../layouts/AuthLayout'

// ── Animation variants ─────────────────────────────────────────────────────
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [formData, setFormData]       = useState({ email: '', password: '' })
  const [errors, setErrors]           = useState({})
  const [loading, setLoading]         = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    // Client-side validation
    const newErrors = {}
    if (!formData.email.trim())    newErrors.email    = 'Email is required.'
    if (!formData.password.trim()) newErrors.password = 'Password is required.'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      return
    }

    try {
      const { data } = await api.post('/login', formData)
      login(data.user, data.token)
      navigate('/dashboard')
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

  return (
    <AuthLayout>
      <motion.div variants={stagger} initial="hidden" animate="show">

        {/* Heading */}
        <motion.div variants={fadeUp} className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-bordo/60 mb-2">
            Welcome back
          </p>
          <h2 className="text-[2rem] font-extrabold leading-tight mb-1.5">
            Sign in to Tether
          </h2>
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-bordo font-semibold hover:underline transition-colors">
              Create one
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

          {/* Email */}
          <motion.div variants={fadeUp}>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-4 h-4 ${errors.email ? 'text-red-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={formData.email} onChange={handleChange}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-300 outline-none transition-all duration-200
                  focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20
                  ${errors.email ? 'border-red-300 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
              />
            </div>
            {errors.email && <ErrorMsg msg={errors.email} />}
          </motion.div>

          {/* Password */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide text-gray-500">
                Password
              </label>
              <a href="#" className="text-xs text-bordo/70 font-medium hover:text-bordo hover:underline transition-colors">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-4 h-4 ${errors.password ? 'text-red-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password} onChange={handleChange}
                placeholder="Enter your password"
                className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-300 outline-none transition-all duration-200
                  focus:bg-white focus:border-sage focus:ring-4 focus:ring-sage/20
                  ${errors.password ? 'border-red-300 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
                aria-label="Toggle password visibility"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password && <ErrorMsg msg={errors.password} />}
          </motion.div>

          {/* Submit */}
          <motion.div variants={fadeUp} className="pt-1">
            <motion.button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{   scale: loading ? 1 : 0.975 }}
              className="w-full py-3.5 px-6 bg-bordo text-cream rounded-xl font-bold text-sm tracking-wide
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
                  Signing in…
                </>
              ) : 'Sign In →'}
            </motion.button>
          </motion.div>

        </form>

        {/* Divider */}
        <motion.div variants={fadeUp} className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-xs text-gray-300 font-medium">or continue with</span>
          </div>
        </motion.div>

        {/* Social placeholders */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Google',
              icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              ),
            },
            {
              label: 'GitHub',
              icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              ),
            },
          ].map(({ label, icon }) => (
            <button
              key={label}
              type="button"
              className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 bg-white text-gray-600 text-sm font-medium transition-all duration-200 hover:shadow-sm"
            >
              {icon}
              {label}
            </button>
          ))}
        </motion.div>

        <motion.p variants={fadeUp} className="mt-7 text-center text-xs text-gray-300">
          By signing in you agree to our{' '}
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
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}
