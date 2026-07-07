import { createPortal } from 'react-dom'
import { Button } from '../../../../../../../../components/ui'
import { CheckCircle2, ScanLine } from 'lucide-react'

/**
 * StickySubmitBar — pins the submit action to the bottom of the viewport on mobile
 * so the operator never has to scroll to find it. Portaled to <body> so it always
 * pins to the real viewport bottom regardless of any transformed/scrolling ancestor.
 */
export default function StickySubmitBar({ scannedCount, pendingCount, allScanned, canSubmit, disabled, loading, onSubmit }) {
  const label = loading
    ? 'Submitting…'
    : allScanned
      ? `Submit All ${scannedCount} Bags`
      : canSubmit
        ? `Submit ${scannedCount} Scanned (${pendingCount} left)`
        : 'Scan at least 1 bag to submit'

  return createPortal(
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] bg-white border-t border-gray-200 px-3 pt-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
    >
      <Button
        onClick={onSubmit}
        disabled={disabled}
        loading={loading}
        icon={allScanned ? CheckCircle2 : ScanLine}
        variant={allScanned ? 'success' : canSubmit ? 'primary' : 'secondary'}
        fullWidth
        size="lg"
        className="!py-3.5 !text-[15px]"
      >
        {label}
      </Button>
    </div>,
    document.body
  )
}
