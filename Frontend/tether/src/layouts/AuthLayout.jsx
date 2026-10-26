import { motion } from 'framer-motion'

// ── Animation variants ─────────────────────────────────────────────────────
const panelVariants = {
  hidden: { opacity: 0, x: -40 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

const formVariants = {
  hidden: { opacity: 0, x: 40 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

// Floating orb config
const orbs = [
  { w: 320, h: 320, top: '-10%',  left: '-8%',  delay: 0,   dur: 7,  color: '#E89951' },
  { w: 260, h: 260, top: '55%',   left: '60%',  delay: 1.5, dur: 9,  color: '#A5CF83' },
  { w: 180, h: 180, top: '30%',   left: '5%',   delay: 3,   dur: 6,  color: '#ECB65F' },
  { w: 140, h: 140, top: '75%',   left: '15%',  delay: 2,   dur: 8,  color: '#F0E76F' },
]

const floatTransition = (delay, dur) => ({
  y:        { duration: dur, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay },
  rotate:   { duration: dur * 1.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay },
  scale:    { duration: dur * 0.8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay },
  opacity:  { duration: 1.2, delay },
})

// Animated content cards that float on the left panel
const previewCards = [
  {
    delay: 0.6,
    y: [-8, 8],
    content: (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-xl w-56">
        <div className="w-9 h-9 rounded-xl bg-bordo/80 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <p className="text-cream text-xs font-bold">New Post</p>
          <p className="text-cream/50 text-[11px]">Draft saved · 2m ago</p>
        </div>
      </div>
    ),
  },
  {
    delay: 0.9,
    y: [6, -10],
    content: (
      <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-xl w-52">
        <p className="text-cream/60 text-[11px] font-medium uppercase tracking-wider mb-2">This week</p>
        <div className="flex items-end gap-1 h-10">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-sm" style={{ background: '#E89951', opacity: 0.7 }}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 1.2 + i * 0.07, duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </div>
        <p className="text-cream text-sm font-bold mt-2">2.4k <span className="text-xs font-normal" style={{ color: '#A5CF83' }}>↑ 18%</span></p>
        <p className="text-cream/40 text-[11px]">Page views</p>
      </div>
    ),
  },
  {
    delay: 1.1,
    y: [-5, 9],
    content: (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-xl">
        <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: '#A5CF83' }} />
        <p className="text-cream text-xs font-medium">Published · <span className="text-cream/50">5 articles today</span></p>
      </div>
    ),
  },
]

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-white overflow-hidden">

      {/* ══════════════════════════════════════════
          LEFT — Brand Panel
      ══════════════════════════════════════════ */}
      <motion.div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col" style={{ background: '#18190F' }}
        variants={panelVariants}
        initial="hidden"
        animate="show"
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #F5DABF 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />

        {/* Floating orbs */}
        {orbs.map((o, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-3xl"
            style={{ width: o.w, height: o.h, top: o.top, left: o.left, background: o.color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2, y: [0, -20, 0], scale: [1, 1.05, 1] }}
            transition={floatTransition(o.delay, o.dur)}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-14">

          {/* Logo */}
          <motion.div
            className="flex items-center gap-3.5"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          >
            {/* Icon mark */}
            <div className="relative w-10 h-10 shrink-0">
              {/* Outer soft glow */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: '#E89951',
                  boxShadow: '0 0 0 1px rgba(240,231,111,0.25), 0 8px 24px rgba(232,153,81,0.55)',
                }}
              />
              {/* Icon: stylised chain-link / tether shape */}
              <svg viewBox="0 0 40 40" fill="none" className="absolute inset-0 w-full h-full p-2">
                {/* Horizontal bar (top of T) */}
                <rect x="4" y="7" width="32" height="7" rx="3.5" fill="#18190F" opacity="0.95"/>
                <rect x="14.5" y="14" width="11" height="19" rx="3.5" fill="#18190F" opacity="0.95"/>
                <circle cx="20" cy="35" r="2.5" fill="#F0E76F"/>
              </svg>
            </div>

            {/* Wordmark */}
            <div className="flex flex-col leading-none">
              <span
                className="font-black tracking-[-0.03em]"
                style={{ fontSize: '1.45rem', letterSpacing: '-0.02em', color: '#18190F' }}
              >
                Tether
              </span>
              <span style={{ color: 'rgba(24,25,15,0.45)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '2px' }}>
                by dulkar
              </span>
            </div>
          </motion.div>

          {/* Hero text */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.p
              variants={fadeUp}
              className="text-cream/40 text-xs font-semibold uppercase tracking-[0.22em] mb-4"
            >
              Content Management
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="font-extrabold leading-[1.08] mb-6"
              style={{ fontSize: 'clamp(2.6rem, 3.8vw, 3.6rem)' }}
            >
              <span className="text-cream block">Write. Manage.</span>
              <span
                style={{
                  background: 'linear-gradient(100deg, #e8919a 0%, #F5DABF 50%, #e8919a 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmerText 4s linear infinite',
                }}
              >
                Publish.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-cream/50 text-base leading-relaxed max-w-xs"
            >
              One platform to control your entire content workflow — structured, fast, and beautiful.
            </motion.p>

            {/* Stats */}
            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-6">
              {[['10K+', 'Users'], ['500+', 'Blogs'], ['99%', 'Uptime']].map(([val, label], i, arr) => (
                <div key={label} className="flex items-center gap-6">
                  <div>
                    <p className="text-cream text-2xl font-bold leading-none">{val}</p>
                    <p className="text-cream/40 text-xs mt-1">{label}</p>
                  </div>
                  {i < arr.length - 1 && <div className="h-7 w-px bg-cream/15 rounded-full" />}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Floating UI preview cards */}
          <div className="relative h-48">
            {previewCards.map((card, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  bottom: i === 0 ? '60%' : i === 1 ? '20%' : '0%',
                  left:   i === 0 ? '0%'  : i === 1 ? '35%' : '5%',
                }}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  y: card.y,
                  scale: 1,
                }}
                transition={{
                  opacity: { delay: card.delay, duration: 0.5 },
                  scale:   { delay: card.delay, duration: 0.5 },
                  y: {
                    delay: card.delay + 0.5,
                    duration: 4 + i,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                  },
                }}
              >
                {card.content}
              </motion.div>
            ))}
          </div>

        </div>
      </motion.div>

      {/* ══════════════════════════════════════════
          RIGHT — Form Slot
      ══════════════════════════════════════════ */}
      <motion.div
        className="flex-1 flex items-center justify-center p-6 lg:p-14 bg-white relative"
        variants={formVariants}
        initial="hidden"
        animate="show"
      >
        {/* Subtle background blobs */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(232,153,81,0.18) 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(165,207,131,0.12) 0%, transparent 70%)',
            transform: 'translate(-30%, 30%)',
          }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-bordo rounded-xl flex items-center justify-center shadow-md shadow-bordo/30">
              <span style={{ color: '#18190F' }} className="font-black text-base">T</span>
            </div>
            <span className="text-green text-xl font-bold tracking-wide">Tether</span>
          </div>

          {children}
        </div>
      </motion.div>

    </div>
  )
}
