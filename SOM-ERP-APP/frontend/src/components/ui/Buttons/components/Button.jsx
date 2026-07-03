import { Loader2 } from 'lucide-react'

// ─── Variant tokens ────────────────────────────────────────────────────────────
// Each variant maps to stable Tailwind utility classes so colors stay consistent
// across the entire app. Add a new variant here, use it everywhere.
const VARIANTS = {
  primary:       'bg-blue-500 hover:bg-blue-600 text-white border-transparent',
  secondary:     'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200',
  danger:        'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
  'danger-solid':'bg-red-600 hover:bg-red-700 text-white border-transparent',
  success:       'bg-green-600 hover:bg-green-700 text-white border-transparent',
  warning:       'bg-orange-500 hover:bg-orange-600 text-white border-transparent',
  purple:        'bg-violet-600 hover:bg-violet-700 text-white border-transparent',
  ghost:         'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
  outline:       'bg-white hover:bg-blue-50 text-blue-600 border-blue-400',
  'outline-gray':'bg-white hover:bg-slate-50 text-slate-600 border-slate-300',
}

// ─── Size tokens ───────────────────────────────────────────────────────────────
const SIZES = {
  xs: { btn: 'px-2.5 py-1 text-[11px] rounded-md gap-1',   icon: 12 },
  sm: { btn: 'px-3 py-1.5 text-[12px] rounded-lg gap-1.5', icon: 14 },
  md: { btn: 'px-[18px] py-[9px] text-[13px] rounded-lg gap-2', icon: 15 },
  lg: { btn: 'px-6 py-[11px] text-[14px] rounded-xl gap-2',icon: 16 },
}

/**
 * Central button component for the entire SOM ERP app.
 *
 * Props:
 *   variant      — 'primary' | 'secondary' | 'danger' | 'danger-solid' |
 *                  'success' | 'warning' | 'purple' | 'ghost' |
 *                  'outline' | 'outline-gray'            (default: 'primary')
 *   size         — 'xs' | 'sm' | 'md' | 'lg'            (default: 'md')
 *   icon         — Lucide icon component, e.g. icon={Plus}
 *   iconPosition — 'left' | 'right'                      (default: 'left')
 *   loading      — shows a spinner and disables the button
 *   fullWidth    — stretches to fill the container
 *   onClick, type, disabled, className — forwarded as-is
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary
  const s = SIZES[size]      ?? SIZES.md
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        // layout
        'inline-flex items-center justify-center font-semibold',
        'border transition-all duration-150 cursor-pointer select-none',
        'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        // variant + size
        v, s.btn,
        // states
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {/* left icon / spinner */}
      {loading
        ? <Loader2 size={s.icon} className="animate-spin flex-shrink-0" />
        : Icon && iconPosition === 'left' && <Icon size={s.icon} className="flex-shrink-0" strokeWidth={2} />
      }

      {children && <span className="leading-none">{children}</span>}

      {/* right icon */}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon size={s.icon} className="flex-shrink-0" strokeWidth={2} />
      )}
    </button>
  )
}
