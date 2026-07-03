import { memo } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '../../Modal/components/Modal.jsx'

/**
 * WarningModal — non-destructive warning before an action proceeds.
 *
 * Examples: Unsaved Changes · Session Expiring · Incomplete Form
 *
 * @param {boolean}  open
 * @param {string}   title          — e.g. "Unsaved Changes"
 * @param {string}   message        — explanation of what the user should know
 * @param {string}   continueText   — proceed CTA     (default "Continue")
 * @param {string}   cancelText     — cancel label    (default "Go Back")
 * @param {function} onContinue
 * @param {function} onCancel
 */
const WarningModal = memo(function WarningModal({
  open,
  title        = 'Are you sure?',
  message      = 'Please review before proceeding.',
  continueText = 'Continue',
  cancelText   = 'Go Back',
  onContinue,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="flex flex-col items-center text-center px-8 pt-8 pb-7">

        {/* ── Icon ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-5">
          <AlertTriangle className="w-8 h-8 text-amber-500" strokeWidth={2.5} />
        </div>

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <h2 className="text-[17px] font-bold text-slate-800 mb-1.5">{title}</h2>
        <p className="text-[13px] text-slate-500 leading-relaxed max-w-[260px]">{message}</p>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="mt-6 flex gap-2.5 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95
                       text-slate-700 text-[13px] font-semibold rounded-xl border border-slate-200
                       transition-all duration-150 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {cancelText}
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95
                       text-white text-[13px] font-semibold rounded-xl
                       transition-all duration-150 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {continueText}
          </button>
        </div>
      </div>
    </Modal>
  )
})

export default WarningModal
