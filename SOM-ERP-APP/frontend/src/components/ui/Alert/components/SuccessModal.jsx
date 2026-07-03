import { useEffect, memo } from 'react'
import { CheckCircle } from 'lucide-react'
import Modal from '../../Modal/components/Modal.jsx'

/**
 * SuccessModal — shown after a successful API operation.
 *
 * Examples: Customer Added · Product Updated · Invoice Generated
 *
 * @param {boolean}  open
 * @param {string}   title        — e.g. "Customer Added"
 * @param {string}   message      — supporting text
 * @param {string}   buttonText   — primary CTA label    (default "Done")
 * @param {function} onClose
 * @param {function} onConfirm    — if omitted, falls back to onClose
 * @param {number}   autoClose    — ms until auto-dismiss (0 = disabled)
 */
const SuccessModal = memo(function SuccessModal({
  open,
  title       = 'Success',
  message     = 'The operation completed successfully.',
  buttonText  = 'Done',
  onClose,
  onConfirm,
  autoClose   = 0,
}) {
  const handleConfirm = onConfirm ?? onClose

  // Optional auto-dismiss
  useEffect(() => {
    if (!open || !autoClose) return
    const t = setTimeout(handleConfirm, autoClose)
    return () => clearTimeout(t)
  }, [open, autoClose, handleConfirm])

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center px-8 pt-8 pb-7">

        {/* ── Animated icon ─────────────────────────────────────────────── */}
        <div className="relative mb-5">
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-40" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
            <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={2.5} />
          </div>
        </div>

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <h2 className="text-[17px] font-bold text-slate-800 mb-1.5">{title}</h2>
        <p className="text-[13px] text-slate-500 leading-relaxed max-w-[260px]">{message}</p>

        {/* ── Action ────────────────────────────────────────────────────── */}
        <button
          onClick={handleConfirm}
          className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 active:scale-95
                     text-white text-[13px] font-semibold rounded-xl
                     transition-all duration-150 focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-green-500"
        >
          {buttonText}
        </button>
      </div>
    </Modal>
  )
})

export default SuccessModal
