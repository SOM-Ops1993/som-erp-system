import { memo } from 'react'
import Spinner from '../../Spinner/components/Spinner.jsx'

// ─── Spinner size that matches Loading size ────────────────────────────────────
const SPINNER_SIZE = { sm: 'sm', md: 'md', lg: 'lg' }

// ─── Title size ───────────────────────────────────────────────────────────────
const TITLE_CLS = {
  sm: 'text-[13px] font-semibold text-slate-700',
  md: 'text-[15px] font-semibold text-slate-700',
  lg: 'text-[17px] font-bold   text-slate-800',
}
const MSG_CLS = {
  sm: 'text-[11px] text-slate-400 max-w-[200px]',
  md: 'text-[12px] text-slate-400 max-w-[260px]',
  lg: 'text-[13px] text-slate-500 max-w-[300px]',
}

// ─── Content (shared across variants) ─────────────────────────────────────────
const LoadingContent = memo(function LoadingContent({ size, color, title, message }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Spinner size={SPINNER_SIZE[size] ?? 'md'} color={color} />
      {title   && <p className={TITLE_CLS[size] ?? TITLE_CLS.md}>{title}</p>}
      {message && <p className={MSG_CLS[size]   ?? MSG_CLS.md}>{message}</p>}
    </div>
  )
})

/**
 * Loading — three display variants:
 *
 *   "inline"     — renders in document flow (use inside cards / tables)
 *   "overlay"    — absolutely positioned over its nearest `relative` parent
 *   "fullscreen" — fixed, covers the entire viewport
 *
 * Prevents accidental duplicate clicks during API calls when used as overlay
 * or fullscreen because it sits on top of the UI.
 *
 * @param {'inline'|'overlay'|'fullscreen'} variant
 * @param {'sm'|'md'|'lg'}                  size
 * @param {'primary'|'white'|'green'|'red'|'gray'} color
 * @param {boolean} blur    — frosted-glass background (overlay / fullscreen only)
 * @param {string}  title   — heading text
 * @param {string}  message — sub-text / description
 * @param {string}  className
 */
const Loading = memo(function Loading({
  variant   = 'inline',
  size      = 'md',
  color     = 'primary',
  blur      = false,
  title,
  message,
  className = '',
}) {
  const blurCls  = blur ? 'backdrop-blur-sm' : ''
  const content  = <LoadingContent size={size} color={color} title={title} message={message} />

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  if (variant === 'fullscreen') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={[
          'fixed inset-0 z-[9998] flex flex-col items-center justify-center',
          'bg-white/90', blurCls, className,
        ].join(' ')}
      >
        {content}
      </div>
    )
  }

  // ── Overlay (absolute — parent must be relative + overflow-hidden) ──────────
  if (variant === 'overlay') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={[
          'absolute inset-0 z-10 flex flex-col items-center justify-center',
          'bg-white/80 rounded-[inherit]', blurCls, className,
        ].join(' ')}
      >
        {content}
      </div>
    )
  }

  // ── Inline (default) ────────────────────────────────────────────────────────
  return (
    <div
      role="status"
      aria-live="polite"
      className={['flex flex-col items-center justify-center py-10', className].join(' ')}
    >
      {content}
    </div>
  )
})

export default Loading
