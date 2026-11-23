import { useEffect, useId, useRef, useState } from 'react'
import { analyticsDate } from '../../utils/analytics'

export default function AnalyticsChart({ daily, metric, label }) {
  const [active, setActive] = useState(null)
  const [width, setWidth] = useState(960)
  const root = useRef(null)
  const gradient = useId().replace(/:/g, '')
  const height = 260, left = 48, right = 20, top = 20, bottom = 40
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)))
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [])
  const maximum = Math.max(4, Math.ceil(Math.max(...daily.map((day) => day[metric]), 0) / 4) * 4)
  const x = (index) => left + (daily.length === 1 ? 0.5 : index / (daily.length - 1)) * (width - left - right)
  const y = (value) => height - bottom - value / maximum * (height - top - bottom)
  const points = daily.map((day, index) => `${x(index)},${y(day[metric])}`).join(' ')
  const area = daily.length > 1 ? `M${x(0)},${height - bottom} L${daily.map((day, index) => `${x(index)},${y(day[metric])}`).join(' L')} L${x(daily.length - 1)},${height - bottom} Z` : ''
  const tickCount = width < 480 ? 3 : 5
  const ticks = [...new Set(Array.from({ length: tickCount }, (_, index) => Math.round(index * (daily.length - 1) / (tickCount - 1))))]
  const selected = active === null ? null : daily[active]

  function point(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const position = (event.clientX - rect.left) / rect.width * width
    setActive(Math.max(0, Math.min(daily.length - 1, Math.round((position - left) / (width - left - right) * (daily.length - 1)))))
  }

  return <div ref={root} className="min-w-0">
    <p aria-live="polite" className="mb-2 min-h-5 text-sm text-gray-500 dark:text-gray-400">
      {selected ? `${analyticsDate(selected.date)}: ${selected[metric].toLocaleString()} ${label.toLowerCase()}` : daily.every((day) => day[metric] === 0) ? `No ${label.toLowerCase()} in this date range.` : 'Point to a day, or focus the chart and use the arrow keys.'}
    </p>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" tabIndex={0} aria-label={`Daily ${label.toLowerCase()}. Use left and right arrow keys to explore each day. A full daily data table is available below.`}
      onPointerMove={point} onPointerDown={point} onPointerLeave={(event) => { if (document.activeElement !== event.currentTarget) setActive(null) }}
      onFocus={() => setActive(0)} onBlur={() => setActive(null)} onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        setActive((index) => event.key === 'Home' ? 0 : event.key === 'End' ? daily.length - 1 : Math.max(0, Math.min(daily.length - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))))
      }} className="h-auto min-h-40 w-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bordo sm:min-h-52">
      <title>{label} per day</title>
      <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#E89951" stopOpacity="0.3" /><stop offset="100%" stopColor="#E89951" stopOpacity="0.02" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((tick) => <g key={tick}>
        <line x1={left} x2={width - right} y1={y(maximum * tick / 4)} y2={y(maximum * tick / 4)} className="stroke-gray-100 dark:stroke-gray-800" />
        <text x={left - 10} y={y(maximum * tick / 4) + 4} textAnchor="end" className="fill-gray-500 text-xs dark:fill-gray-400">{(maximum * tick / 4).toLocaleString()}</text>
      </g>)}
      {area && <path d={area} fill={`url(#${gradient})`} />}
      <polyline points={points} fill="none" stroke="#E89951" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {daily.length === 1 && <circle cx={x(0)} cy={y(daily[0][metric])} r={5} fill="#E89951" />}
      {selected && <g><line x1={x(active)} x2={x(active)} y1={top} y2={height - bottom} stroke="#E89951" strokeDasharray="4 4" /><circle cx={x(active)} cy={y(selected[metric])} r={5} fill="#E89951" className="stroke-white dark:stroke-gray-900" strokeWidth={2} /></g>}
      {ticks.map((index) => <text key={index} x={x(index)} y={height - 12} textAnchor={index === 0 && daily.length > 1 ? 'start' : index === daily.length - 1 && daily.length > 1 ? 'end' : 'middle'} className="fill-gray-500 text-xs dark:fill-gray-400">{analyticsDate(daily[index].date, { month: 'short', day: 'numeric' })}</text>)}
    </svg>
  </div>
}
