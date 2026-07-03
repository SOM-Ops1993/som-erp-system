import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ─── Panel size → max-width ───────────────────────────────────────────────────
const SIZES = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-4xl',
}

// Elements that can receive keyboard focus
const FOCUSABLE = [
  'a[href]:not([disabled])',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Base Modal — every alert, confirm, and delete modal is built on this.
 *
 * Features
 *   • ReactDOM.createPortal → renders directly on <body>, avoids z-index wars
 *   • Smooth enter / leave animations (opacity + scale + slide)
 *   • Body scroll lock (restores scroll position on close)
 *   • ESC key close
 *   • Click-outside close
 *   • Focus trap (Tab / Shift+Tab cycles within the panel)
 *   • Returns focus to the trigger element on close
 *   • aria-modal + role="dialog" for screen readers
 *
 * @param {boolean}    open
 * @param {function}   onClose
 * @param {ReactNode}  children
 * @param {'sm'|'md'|'lg'|'xl'|'full'} size
 * @param {boolean}    closeOnOverlay   (default true)
 * @param {boolean}    closeOnEsc       (default true)
 * @param {string}     className        extra classes for the panel
 */
const Modal = memo(function Modal({
  open,
  onClose,
  children,
  size            = 'md',
  closeOnOverlay  = true,
  closeOnEsc      = true,
  className       = '',
}) {
  // Two-phase animation: mounted (in DOM) → visible (CSS transition fires)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const panelRef      = useRef(null)
  const prevFocusRef  = useRef(null)   // element to return focus to on close

  // ── Open / close lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement
      setMounted(true)
      // Double rAF: first frame mounts (opacity-0), second frame triggers transition
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(raf1)
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        prevFocusRef.current?.focus?.()
      }, 220)
      return () => clearTimeout(t)
    }
  }, [open])

  // ── Body scroll lock ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    const scrollY = window.scrollY
    const originalStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top:      document.body.style.top,
      width:    document.body.style.width,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top      = `-${scrollY}px`
    document.body.style.width    = '100%'
    return () => {
      Object.assign(document.body.style, originalStyle)
      window.scrollTo(0, scrollY)
    }
  }, [mounted])

  // ── ESC key ─────────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose() }
  }, [onClose])

  useEffect(() => {
    if (!closeOnEsc || !mounted) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeOnEsc, mounted, handleKeyDown])

  // ── Focus trap (Tab / Shift+Tab) ────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !panelRef.current) return
    const panel    = panelRef.current
    const getFocusable = () => Array.from(panel.querySelectorAll(FOCUSABLE))

    // Auto-focus first focusable element
    const focusable = getFocusable()
    focusable[0]?.focus()

    const trapTab = (e) => {
      if (e.key !== 'Tab') return
      const nodes = getFocusable()
      if (!nodes.length) { e.preventDefault(); return }
      const first = nodes[0]
      const last  = nodes[nodes.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault(); last?.focus()
        }
      } else {
        if (active === last || !panel.contains(active)) {
          e.preventDefault(); first?.focus()
        }
      }
    }

    panel.addEventListener('keydown', trapTab)
    return () => panel.removeEventListener('keydown', trapTab)
  }, [visible])

  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
    >
      {/* ── Backdrop ────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={closeOnOverlay ? onClose : undefined}
        className={[
          'absolute inset-0 bg-black/50 backdrop-blur-[2px]',
          'transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* ── Panel ───────────────────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        className={[
          'relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden',
          'transition-all duration-200 ease-out',
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4',
          SIZES[size] ?? SIZES.md,
          className,
        ].join(' ')}
      >
        {children}
      </div>
    </div>,
    document.body
  )
})

export default Modal
