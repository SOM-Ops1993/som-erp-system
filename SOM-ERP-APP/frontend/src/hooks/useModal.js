import { useState, useCallback } from 'react'

/**
 * useModal — lightweight state manager for a single modal.
 *
 * Usage:
 *   const success = useModal()
 *   <SuccessModal open={success.open} onClose={success.onClose} ... />
 *   <button onClick={success.onOpen}>Save</button>
 *
 * @param {boolean} initial  — starting open state (default false)
 * @returns {{ open, onOpen, onClose, toggle }}
 */
export function useModal(initial = false) {
  const [open, setOpen] = useState(initial)
  const onOpen  = useCallback(() => setOpen(true),           [])
  const onClose = useCallback(() => setOpen(false),          [])
  const toggle  = useCallback(() => setOpen((p) => !p),     [])
  return { open, onOpen, onClose, toggle }
}

/**
 * useConfirmModal — variant with an embedded async handler.
 *
 * Usage:
 *   const del = useConfirmModal(async (id) => { await api.delete(id) })
 *   <DeleteModal open={del.open} loading={del.loading} onDelete={() => del.run(row.id)} onCancel={del.onClose} />
 *   <button onClick={del.onOpen}>Delete</button>
 *
 * @param {function} handler  — async fn to call on confirm
 */
export function useConfirmModal(handler) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)

  const onOpen  = useCallback(() => setOpen(true), [])
  const onClose = useCallback(() => { if (!loading) setOpen(false) }, [loading])

  const run = useCallback(async (...args) => {
    setLoading(true)
    try {
      await handler(...args)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [handler])

  return { open, loading, onOpen, onClose, run }
}
