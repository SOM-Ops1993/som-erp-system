import { useState, useRef, useEffect } from 'react'
import { Button } from '../../../../../../../../components/ui'
import { Plus, X } from 'lucide-react'

/**
 * ManualEntryDrawer — Pack ID entry is rarely used compared to scanning, so it stays
 * collapsed behind a single tap target instead of permanently occupying screen space.
 */
export default function ManualEntryDrawer({ value, onChange, onSubmit }) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm font-semibold active:bg-gray-50 transition-colors"
      >
        <Plus size={15} /> Enter Pack ID Manually
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => { onSubmit(e); }}
      className="flex gap-2"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Type / paste Pack ID"
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Button type="submit" disabled={!value.trim()} variant="primary" size="sm">Add</Button>
      <Button type="button" onClick={() => setOpen(false)} variant="secondary" size="sm" icon={X} />
    </form>
  )
}
