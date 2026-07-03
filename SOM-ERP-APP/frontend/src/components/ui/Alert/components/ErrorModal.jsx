import { memo } from 'react'
import { XCircle, RotateCcw } from 'lucide-react'
import Modal from '../../Modal/components/Modal.jsx'

/**
 * ErrorModal — shown when an API call fails.
 *
 * Examples: Network Error · Unauthorized · Validation Failed · Server Error
 *
 * @param {boolean}  open
 * @param {string}   title       — e.g. "Something went wrong"
 * @param {string}   message     — the error description / server message
 * @param {string}   retryText   — retry button label   (default "Try Again")
 * @param {function} onClose
 * @param {function} onRetry     — if omitted, retry button is not shown
 */
const ErrorModal = memo(function ErrorModal({
  open,
  title     = 'Something Went Wrong',
  message   = 'An unexpected error occurred. Please try again.',
  retryText = 'Try Again',
  onClose,
  onRetry,
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center px-8 pt-8 pb-7">

        {/* ── Icon ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-5">
          <XCircle className="w-8 h-8 text-red-600" strokeWidth={2.5} />
        </div>

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <h2 className="text-[17px] font-bold text-slate-800 mb-1.5">{title}</h2>
        <p className="text-[13px] text-slate-500 leading-relaxed max-w-[260px]">{message}</p>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className={`mt-6 flex gap-2.5 w-full ${onRetry ? 'flex-row' : 'flex-col'}`}>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5
                         bg-red-600 hover:bg-red-700 active:scale-95
                         text-white text-[13px] font-semibold rounded-xl
                         transition-all duration-150 focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <RotateCcw size={14} strokeWidth={2.5} />
              {retryText}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95
                       text-slate-700 text-[13px] font-semibold rounded-xl border border-slate-200
                       transition-all duration-150 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
})

export default ErrorModal
