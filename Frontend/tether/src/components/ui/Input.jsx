/**
 * Reusable Input component
 *
 * @param {string}      label
 * @param {string}      error
 * @param {ReactNode}   icon       - left icon element
 * @param {ReactNode}   rightEl    - right element (e.g. show/hide toggle)
 */
export default function Input({
  label,
  error,
  icon,
  rightEl,
  id,
  className = '',
  ...props
}) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <span className={`w-5 h-5 ${error ? 'text-red-400' : 'text-gray-400'}`}>{icon}</span>
          </div>
        )}
        <input
          id={id}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} ${rightEl ? 'pr-12' : 'pr-4'} py-3 rounded-xl border text-sm bg-white text-gray-900 placeholder-gray-400 outline-none transition-all duration-200
            focus:ring-2 focus:ring-green/30 focus:border-green
            ${error
              ? 'border-red-400 bg-red-50 focus:ring-red-200 focus:border-red-400'
              : 'border-gray-200 hover:border-gray-300'}
            ${className}`}
          {...props}
        />
        {rightEl && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
            {rightEl}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span>
          {Array.isArray(error) ? error[0] : error}
        </p>
      )}
    </div>
  )
}
