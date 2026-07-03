import { memo } from 'react'

// ─── Size → Tailwind class ────────────────────────────────────────────────────
const SIZE_CLS = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-[3px]',
  lg: 'w-8 h-8 border-4',
  xl: 'w-12 h-12 border-4',
}

// ─── Color → Tailwind class (track / active segment) ─────────────────────────
const COLOR_CLS = {
  primary: 'border-blue-200 border-t-blue-600',
  white:   'border-white/25 border-t-white',
  green:   'border-green-200 border-t-green-600',
  red:     'border-red-200 border-t-red-600',
  gray:    'border-slate-200 border-t-slate-500',
  yellow:  'border-amber-200 border-t-amber-500',
}

/**
 * Spinner — standalone animated loading indicator.
 *
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} size
 * @param {'primary'|'white'|'green'|'red'|'gray'|'yellow'} color
 * @param {string} className   — additional Tailwind classes
 * @param {string} label       — aria-label for screen readers (default "Loading")
 */
const Spinner = memo(function Spinner({
  size      = 'md',
  color     = 'primary',
  className = '',
  label     = 'Loading',
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={[
        'rounded-full animate-spin flex-shrink-0',
        SIZE_CLS[size]  ?? SIZE_CLS.md,
        COLOR_CLS[color] ?? COLOR_CLS.primary,
        className,
      ].join(' ')}
    />
  )
})

export default Spinner
