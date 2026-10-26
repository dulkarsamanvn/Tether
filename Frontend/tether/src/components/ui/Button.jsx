/**
 * Reusable Button component
 *
 * @param {'primary'|'secondary'|'ghost'} variant
 * @param {boolean} loading
 */
export default function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]'

  const variants = {
    primary:   'bg-bordo text-cream hover:bg-bordo-dark shadow-md hover:shadow-lg py-3 px-6',
    secondary: 'bg-green text-cream hover:bg-green-dark shadow-md hover:shadow-lg py-3 px-6',
    ghost:     'bg-transparent text-bordo border border-bordo hover:bg-bordo/10 py-3 px-6',
  }

  return (
    <button
      disabled={loading || props.disabled}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
