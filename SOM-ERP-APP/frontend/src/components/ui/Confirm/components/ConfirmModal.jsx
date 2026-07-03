import { memo } from 'react'
import { HelpCircle } from 'lucide-react'
import Modal from '../../Modal/components/Modal.jsx'
import Spinner from '../../Spinner/components/Spinner.jsx'

/**
 * ConfirmModal — two-button dialog for approve / accept / reject actions.
 *
 * Examples: Approve Purchase Order · Accept Delivery · Reject Sample
 *
 * @param {boolean}           open
 * @param {string}            title
 * @param {string}            message
 * @param {string}            acceptText   (default "Confirm")
 * @param {string}            cancelText   (default "Cancel")
 * @param {boolean}           loading      — disables both buttons + shows spinner
 * @param {function}          onAccept
 * @param {function}          onCancel
 * @param {'default'|'danger'} variant     — accept button color (default = blue)
 * @param {ReactNode}         icon         — override the default icon
 */
const ConfirmModal = memo(function ConfirmModal({
  open,
  title       = 'Are you sure?',
  message     = 'Please confirm you want to proceed.',
  acceptText  = 'Confirm',
  cancelText  = 'Cancel',
  loading     = false,
  onAccept,
  onCancel,
  variant     = 'default',
  icon,
}) {
  const isDanger = variant === 'danger'

  const acceptCls = isDanger
    ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
    : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500'

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      // Prevent clicking outside during a loading state
      closeOnOverlay={!loading}
      closeOnEsc={!loading}
    >
      <div className="flex flex-col items-center text-center px-8 pt-8 pb-7">

        {/* ── Icon ──────────────────────────────────────────────────────── */}
        <div className={[
          'flex items-center justify-center w-16 h-16 rounded-full mb-5',
          isDanger ? 'bg-red-100' : 'bg-blue-100',
        ].join(' ')}>
          {icon ?? (
            <HelpCircle
              className={`w-8 h-8 ${isDanger ? 'text-red-600' : 'text-blue-600'}`}
              strokeWidth={2.5}
            />
          )}
        </div>

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <h2 className="text-[17px] font-bold text-slate-800 mb-1.5">{title}</h2>
        <p className="text-[13px] text-slate-500 leading-relaxed max-w-[260px]">{message}</p>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="mt-6 flex gap-2.5 w-full">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95
                       text-slate-700 text-[13px] font-semibold rounded-xl border border-slate-200
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                       transition-all duration-150 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {cancelText}
          </button>

          <button
            onClick={onAccept}
            disabled={loading}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2.5',
              'text-white text-[13px] font-semibold rounded-xl',
              'active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100',
              'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2',
              acceptCls,
            ].join(' ')}
          >
            {loading && <Spinner size="xs" color="white" />}
            {acceptText}
          </button>
        </div>
      </div>
    </Modal>
  )
})

export default ConfirmModal
