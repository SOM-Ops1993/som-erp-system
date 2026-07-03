import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from '../../Modal/components/Modal.jsx'
import Spinner from '../../Spinner/components/Spinner.jsx'

/**
 * DeleteModal — hard-danger dialog for irreversible delete operations.
 *
 * Examples: Delete Product · Remove Customer · Purge Batch Record
 *
 * The red theme + explicit "Delete" label communicates danger far more clearly
 * than a generic Confirm dialog — users read it before clicking.
 *
 * @param {boolean}  open
 * @param {string}   title        — e.g. "Delete Product"
 * @param {string}   message      — explanation / consequences
 * @param {string}   itemName     — highlighted name of the item (bold in message)
 * @param {string}   deleteText   — destructive CTA   (default "Delete")
 * @param {string}   cancelText   — safe CTA           (default "Cancel")
 * @param {boolean}  loading      — shows spinner, disables both buttons
 * @param {function} onDelete
 * @param {function} onCancel
 */
const DeleteModal = memo(function DeleteModal({
  open,
  title      = 'Delete Item',
  message    = 'This action cannot be undone.',
  itemName,
  deleteText = 'Delete',
  cancelText = 'Cancel',
  loading    = false,
  onDelete,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      closeOnOverlay={!loading}
      closeOnEsc={!loading}
    >
      <div className="flex flex-col items-center text-center px-8 pt-8 pb-7">

        {/* ── Icon ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-5">
          <Trash2 className="w-7 h-7 text-red-600" strokeWidth={2} />
        </div>

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <h2 className="text-[17px] font-bold text-slate-800 mb-1.5">{title}</h2>

        {itemName ? (
          <p className="text-[13px] text-slate-500 leading-relaxed max-w-[260px]">
            {message}
            {' '}
            <span className="font-semibold text-slate-700">&ldquo;{itemName}&rdquo;</span>
            {' '}will be permanently removed.
          </p>
        ) : (
          <p className="text-[13px] text-slate-500 leading-relaxed max-w-[260px]">{message}</p>
        )}

        {/* ── Actions: Cancel first (safe), Delete second (danger) ──────── */}
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
            onClick={onDelete}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5
                       bg-red-600 hover:bg-red-700 active:scale-95
                       text-white text-[13px] font-semibold rounded-xl
                       disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100
                       transition-all duration-150 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {loading
              ? <Spinner size="xs" color="white" />
              : <Trash2 size={13} strokeWidth={2.5} />
            }
            {deleteText}
          </button>
        </div>
      </div>
    </Modal>
  )
})

export default DeleteModal
