const STEPS = [
  'Select the item from Item Master',
  'Enter number of bags received and qty per bag',
  'System auto-generates unique Pack IDs and Lot No',
  'Click Print Labels to download PDF for all bags',
  'Stick labels on bags, then go to Inward to scan them in',
]

export default function HowItWorks() {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold mb-3 text-slate-800">How It Works</h2>
      <ol className="space-y-3 text-sm text-slate-700">
        {STEPS.map((text, i) => (
          <li key={i} className="flex gap-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        Pack ID format: <strong>LBL-ITEMCODE-YEAR-LOTSEQ-BAGNO</strong>
        <br />
        Example: <strong>CIT-151464-2026-001-001</strong>
      </div>
    </div>
  )
}
