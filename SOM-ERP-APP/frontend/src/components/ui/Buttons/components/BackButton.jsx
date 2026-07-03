import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Back navigation button.
 *
 * Props:
 *   label    — button text           (default: 'Back')
 *   onClick  — custom click handler; if omitted, navigate(-1) is used
 *   size     — 'sm' | 'md' | 'lg'   (default: 'md')
 */
export default function BackButton({ label = 'Back', onClick, size = 'md' }) {
  const navigate = useNavigate()

  const sizes = {
    sm: 'px-3 py-1.5 text-[12px] rounded-lg gap-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5',
    md: 'px-3.5 py-2 text-[13px] rounded-xl gap-2 [&_svg]:w-4 [&_svg]:h-4',
    lg: 'px-4 py-2.5 text-[14px] rounded-xl gap-2 [&_svg]:w-[18px] [&_svg]:h-[18px]',
  }

  return (
    <button
      type="button"
      onClick={onClick ?? (() => navigate(-1))}
      className={[
        'group inline-flex items-center font-medium',
        'bg-white border border-slate-200 shadow-sm text-slate-600',
        'hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 hover:shadow',
        'active:scale-95 transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        sizes[size] ?? sizes.md,
      ].join(' ')}
    >
      <ArrowLeft
        strokeWidth={2}
        className="text-slate-400 group-hover:text-slate-600 transition-colors duration-150 group-hover:-translate-x-0.5"
      />
      {label}
    </button>
  )
}
