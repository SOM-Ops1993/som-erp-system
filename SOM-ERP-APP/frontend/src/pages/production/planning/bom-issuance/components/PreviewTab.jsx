import { bomInnerHtml, bomDualHalfPage, isDualCopy, buildPrintHtml } from '../utils/bomPrintTemplates.js'
import { printBoms, bomTitle } from '../utils/bomIssuancePrint.js'

export default function PreviewTab({ previews, onBack, onConfirm, confirming }) {
  if (!previews.length) {
    return (
      <div className="p-10 text-center text-gray-400">
        No BOMs generated yet. Go to the Issue BOM tab.
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="font-semibold text-gray-900">Preview</p>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Print / Save PDF opens each BOM's paperwork in a new tab — choose "Save as PDF" in the browser print dialog.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="px-3.5 py-2 text-[13px] font-semibold border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
          <button onClick={() => printBoms(previews, bomTitle(previews[0]) + (previews.length > 1 ? `_x${previews.length}` : ''))}
            className="px-3.5 py-2 text-[13px] font-semibold border border-gray-300 rounded-lg hover:bg-gray-50">
            🖨 Print / Save PDF (all)
          </button>
          <button onClick={onConfirm} disabled={confirming}
            className="px-4 py-2 text-[13px] font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg">
            {confirming ? 'Issuing…' : '✅ Confirm Issue'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {previews.map((bom, i) => {
          const dual = isDualCopy(bom)
          const content = dual ? bomDualHalfPage(bom) : bomInnerHtml(bom)
          const srcDoc = buildPrintHtml(content, bomTitle(bom))
          return (
            <div key={bom.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[13px]">
                <span>
                  <b>BOM {i + 1}/{previews.length}</b> — {bom.bomNo} · Batch: {bom.batchNo} · Cycle {bom.cycleNo}/{bom.totalCycles}
                  {dual && <span className="ml-2 bg-green-100 text-green-700 text-[11px] px-2 py-0.5 rounded-full font-semibold">✂ Dual half-page (≤6 comps)</span>}
                </span>
                <button onClick={() => printBoms([bom], bomTitle(bom))}
                  className="px-2.5 py-1 text-[12px] font-semibold border border-gray-300 rounded-md hover:bg-white">
                  ⬇ Save as PDF
                </button>
              </div>
              <div className="bg-gray-200 p-2.5 overflow-x-auto">
                <iframe title={`bom-preview-${i}`} srcDoc={srcDoc}
                  style={{ width: '210mm', height: '297mm', transform: 'scale(0.68)', transformOrigin: 'top left', border: 'none', background: '#fff' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
