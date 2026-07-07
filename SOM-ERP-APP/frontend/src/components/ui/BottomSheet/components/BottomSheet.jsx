import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const CLOSE_DRAG_THRESHOLD  = 90   // px dragged down before it snaps closed
const EXPAND_DRAG_THRESHOLD = 60   // px dragged up (while half-open) before it snaps to full screen

/**
 * BottomSheet — mobile-friendly panel that slides up from the bottom of the screen.
 * Drag the handle (or header) down to close, up to expand full-screen, or tap the backdrop / Esc.
 *
 * @param {boolean}   open
 * @param {function}  onClose
 * @param {string}    title      optional header title
 * @param {ReactNode} children
 * @param {boolean}   defaultExpanded  start full-screen instead of half-height (default false)
 */
const BottomSheet = memo(function BottomSheet({
  open,
  onClose,
  title,
  children,
  defaultExpanded = false,
  className = '',
}) {
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [dragY, setDragY]       = useState(0)
  const draggingRef  = useRef(false)
  const startYRef    = useRef(0)
  const panelRef     = useRef(null)

  useEffect(() => {
    if (open) {
      setExpanded(defaultExpanded)
      setDragY(0)
      setMounted(true)
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(raf1)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 220)
      return () => clearTimeout(t)
    }
  }, [open, defaultExpanded])

  // Body scroll lock while the sheet is on screen
  useEffect(() => {
    if (!mounted) return
    const scrollY = window.scrollY
    const original = {
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
      Object.assign(document.body.style, original)
      window.scrollTo(0, scrollY)
    }
  }, [mounted])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose() }
  }, [onClose])

  useEffect(() => {
    if (!mounted) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mounted, handleKeyDown])

  // ── Drag-to-close / drag-to-expand ──────────────────────────────────────────
  const onTouchStart = (e) => {
    draggingRef.current = true
    startYRef.current = e.touches[0].clientY
  }
  const onTouchMove = (e) => {
    if (!draggingRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    // Dragging up while already expanded has nowhere to go — ignore.
    if (expanded && delta < 0) return
    setDragY(delta)
  }
  const onTouchEnd = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (dragY > CLOSE_DRAG_THRESHOLD) {
      onClose()
    } else if (!expanded && dragY < -EXPAND_DRAG_THRESHOLD) {
      setExpanded(true)
    }
    setDragY(0)
  }

  if (!mounted) return null

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[9999] flex flex-col justify-end">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'absolute inset-0 bg-black/50',
          'transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      <div
        ref={panelRef}
        style={{
          transform: visible
            ? `translateY(${Math.max(dragY, 0)}px)`
            : 'translateY(100%)',
          transition: draggingRef.current ? 'none' : 'transform 220ms ease-out, height 220ms ease-out',
          height: expanded ? '100dvh' : '75dvh',
        }}
        className={[
          'relative w-full bg-white rounded-t-2xl shadow-2xl flex flex-col',
          'max-h-[100dvh] overflow-hidden',
          className,
        ].join(' ')}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="shrink-0 pt-2.5 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {title && (
          <div className="shrink-0 flex items-center justify-between px-4 pb-3 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-90 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
})

export default BottomSheet
