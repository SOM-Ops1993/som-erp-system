const TONES = {
  success: { bg: 'bg-green-50 active:bg-green-100', border: 'border-green-200', text: 'text-green-700', count: 'text-green-800' },
  warning: { bg: 'bg-orange-50 active:bg-orange-100', border: 'border-orange-200', text: 'text-orange-700', count: 'text-orange-800' },
}

/**
 * ScanSummaryCard — compact tap target replacing a full inline list on mobile.
 * Shows a count + label; tapping opens a BottomSheet with the full list.
 */
export default function ScanSummaryCard({ icon: Icon, label, count, tone = 'success', onClick }) {
  const t = TONES[tone] ?? TONES.success
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border ${t.bg} ${t.border} transition-colors active:scale-[0.98]`}
    >
      <Icon size={20} className={`shrink-0 ${t.text}`} />
      <div className="min-w-0 text-left">
        <div className={`text-lg font-extrabold leading-none ${t.count}`}>{count}</div>
        <div className={`text-[11px] font-semibold mt-0.5 ${t.text}`}>{label}</div>
      </div>
    </button>
  )
}
