import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import api from '../api/api'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

const navItems = [
  {
    label: 'Home',
    to: '/dashboard',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'My Blogs',
    to: '/dashboard/blogs',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Write',
    to: '/dashboard/write',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
]

export default function DashboardLayout() {
  const { user, logout }  = useAuth()
  const { theme, toggle } = useTheme()
  const navigate          = useNavigate()

  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try { await api.post('/logout') } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-cream dark:bg-gray-950 transition-colors duration-300">

      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════
          SIDEBAR
      ══════════════════════════════════ */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className={`
          fixed lg:static inset-y-0 left-0 z-30 flex flex-col shrink-0 overflow-hidden
          bg-white dark:bg-green
          border-r border-gray-200 dark:border-green-dark/60
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 lg:transition-none
        `}
      >
        {/* ── Logo + collapse toggle ── */}
        <div className="flex items-center h-16 px-4
          border-b border-gray-200 dark:border-green-dark/60
          shrink-0 justify-between">

          <div className="flex items-center gap-3 min-w-0">
            {/* Icon mark */}
            <div className="relative w-9 h-9 shrink-0">
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: '#E89951',
                  boxShadow: '0 0 0 1px rgba(240,231,111,0.25), 0 6px 16px rgba(232,153,81,0.4)',
                }}
              />
              <svg viewBox="0 0 40 40" fill="none" className="absolute inset-0 w-full h-full p-2">
                <rect x="4" y="7" width="32" height="7" rx="3.5" fill="#18190F" opacity="0.95"/>
                <rect x="14.5" y="14" width="11" height="19" rx="3.5" fill="#18190F" opacity="0.95"/>
                <circle cx="20" cy="35" r="2.5" fill="#F0E76F"/>
              </svg>
            </div>

            {/* Wordmark */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {/* Light mode: dark text / Dark mode: orange text */}
                  <p className="font-black text-base leading-none tracking-tight
                    text-green dark:text-bordo">
                    Tether
                  </p>
                  <p className="text-[9px] tracking-widest uppercase mt-0.5
                    text-green/40 dark:text-bordo/50">
                    by dulkar
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapse toggle */}
          <motion.button
            onClick={() => setCollapsed((v) => !v)}
            whileTap={{ scale: 0.9 }}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg
              text-gray-400 hover:text-gray-700 hover:bg-gray-100
              dark:text-cream/40 dark:hover:text-cream dark:hover:bg-white/10
              transition-colors duration-150 shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.svg
              className="w-4 h-4"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </motion.svg>
          </motion.button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-150 group relative
                 ${isActive
                   /* Active: orange bg, dark text always */
                   ? 'bg-bordo text-green dark:text-green shadow-md shadow-bordo/30'
                   /* Inactive: muted in both modes */
                   : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100 dark:text-cream/60 dark:hover:text-cream dark:hover:bg-white/10'
                 }`
              }
            >
              {item.icon}

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="
                  absolute left-full ml-3 px-2.5 py-1.5
                  bg-gray-800 dark:bg-gray-700 text-white text-xs font-semibold
                  rounded-lg shadow-xl whitespace-nowrap z-50
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-150
                ">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800 dark:border-r-gray-700" />
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── User info ── */}
        <div className="p-3 border-t border-gray-200 dark:border-green-dark/60 shrink-0">
          <div className="flex items-center gap-3 px-1.5 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md"
              style={{ background: '#E89951' }}>
              <span className="text-xs font-bold" style={{ color: '#18190F' }}>
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  className="min-w-0 overflow-hidden"
                >
                  <p className="text-xs font-semibold truncate whitespace-nowrap
                    text-green dark:text-cream">
                    {user?.name ?? 'User'}
                  </p>
                  <p className="text-[10px] truncate whitespace-nowrap
                    text-green/40 dark:text-cream/40">
                    {user?.email ?? ''}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* ══════════════════════════════════
          MAIN AREA
      ══════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Topbar ── */}
        <header className="sticky top-0 z-10 h-16 flex items-center justify-between px-5
          bg-white/90 dark:bg-gray-900/80 backdrop-blur-md
          border-b border-gray-200 dark:border-gray-800
          transition-colors duration-300">

          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg
                text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">Dashboard</p>
          </div>

          <div className="flex items-center gap-2">

            {/* Theme toggle */}
            <motion.button
              id="theme-toggle-btn"
              onClick={toggle}
              whileTap={{ scale: 0.88 }}
              className="w-9 h-9 flex items-center justify-center rounded-xl
                bg-gray-100 dark:bg-gray-800
                text-gray-500 dark:text-amber
                hover:bg-gray-200 dark:hover:bg-gray-700
                transition-colors duration-200"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                  <motion.svg key="sun" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0,   opacity: 1, scale: 1 }}
                    exit={{   rotate:  90,  opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
                  </motion.svg>
                ) : (
                  <motion.svg key="moon" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0,  opacity: 1, scale: 1 }}
                    exit={{   rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Logout */}
            <motion.button
              id="logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold
                text-gray-400 dark:text-gray-400
                hover:bg-red-50 hover:text-red-500
                dark:hover:bg-red-900/20 dark:hover:text-red-400
                transition-colors duration-200 disabled:opacity-60"
            >
              {loggingOut ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              )}
              <span className="hidden sm:inline">{loggingOut ? 'Signing out…' : 'Logout'}</span>
            </motion.button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
