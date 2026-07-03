/**
 * Square icon-only button — for toolbar actions, table row actions, etc.
 *
 * Props:
 *   icon      — Lucide icon component (required)
 *   variant   — matches Button.jsx variants  (default: 'ghost')
 *   size      — 'xs' | 'sm' | 'md' | 'lg'  (default: 'sm')
 *   tooltip   — native title attribute for hover tooltip
 *   onClick, disabled, className — forwarded
 */

const VARIANTS = {
  primary:       'bg-blue-500 hover:bg-blue-600 text-white border-transparent',
  secondary:     'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200',
  danger:        'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
  'danger-solid':'bg-red-600 hover:bg-red-700 text-white border-transparent',
  success:       'bg-green-600 hover:bg-green-700 text-white border-transparent',
  warning:       'bg-orange-500 hover:bg-orange-600 text-white border-transparent',
  purple:        'bg-violet-600 hover:bg-violet-700 text-white border-transparent',
  ghost:         'bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-transparent',
  outline:       'bg-white hover:bg-blue-50 text-blue-600 border-blue-300',
  'outline-gray':'bg-white hover:bg-slate-50 text-slate-500 border-slate-300',
}

const SIZES = {
  xs: { box: 'w-6 h-6 rounded', icon: 12 },
  sm: { box: 'w-7 h-7 rounded-lg', icon: 14 },
  md: { box: 'w-8 h-8 rounded-lg', icon: 16 },
  lg: { box: 'w-10 h-10 rounded-xl', icon: 18 },
}

export default function IconButton({
  icon: Icon,
  variant = 'ghost',
  size = 'sm',
  tooltip,
  disabled = false,
  className = '',
  onClick,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.ghost
  const s = SIZES[size]      ?? SIZES.sm

  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center border',
        'transition-all duration-150 cursor-pointer flex-shrink-0',
        'active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        v, s.box,
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      <Icon size={s.icon} strokeWidth={2} />
    </button>
  )
}
