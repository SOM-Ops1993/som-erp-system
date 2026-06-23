import { DSection, DGrid, DRow } from './DetailModal.jsx'

export default function TransactionDetailModal({ detail, onClose }) {
  if (!detail) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Transaction Detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {detail.loading ? (
            <p className="text-gray-400">Loading details...</p>
          ) : detail.error ? (
            <p className="text-red-500">{detail.error}</p>
          ) : (
            <>
              <DSection title="📋 Transaction">
                <DGrid>
                  <DRow label="Date & Time"    value={new Date(detail.entry.timestamp).toLocaleString('en-IN')} />
                  <DRow label="Item Code"      value={detail.entry.itemCode} mono />
                  <DRow label="Type"           value={detail.entry.transactionType} />
                  <DRow label="Source / Pack ID" value={detail.entry.sourceId} mono />
                  <DRow label="In Qty"         value={detail.entry.inQty  > 0 ? `+${Number(detail.entry.inQty).toFixed(3)}`  : '—'} />
                  <DRow label="Out Qty"        value={detail.entry.outQty > 0 ? `−${Number(detail.entry.outQty).toFixed(3)}` : '—'} />
                  <DRow label="Balance After"  value={Number(detail.entry.balance).toFixed(3)} />
                  <DRow label="Reference"      value={detail.entry.reference || '—'} />
                </DGrid>
              </DSection>

              {detail.detail?.pack && (
                <DSection title="📦 Pack / Bag Details">
                  <DGrid>
                    <DRow label="Pack ID"   value={detail.detail.pack.packId} mono />
                    <DRow label="Item Name" value={detail.detail.pack.itemName} />
                    <DRow label="Lot No"    value={detail.detail.pack.lotNo} />
                    <DRow label="Bag No"    value={`#${detail.detail.pack.bagNo}`} />
                    <DRow label="Pack Qty"  value={`${detail.detail.pack.packQty} ${detail.detail.pack.uom}`} />
                    {detail.detail.pack.supplier  && <DRow label="Supplier"   value={detail.detail.pack.supplier} />}
                    {detail.detail.pack.invoiceNo && <DRow label="Invoice No" value={detail.detail.pack.invoiceNo} />}
                  </DGrid>
                </DSection>
              )}

              {detail.detail?.inward && (
                <DSection title="📥 Inward Details">
                  <DGrid>
                    <DRow label="Warehouse"    value={detail.detail.inward.warehouse} />
                    <DRow label="Inward Time"  value={new Date(detail.detail.inward.inwardTime).toLocaleString('en-IN')} />
                  </DGrid>
                </DSection>
              )}

              {detail.detail?.indent && (
                <DSection title="📝 Production Indent">
                  <DGrid>
                    <DRow label="Indent ID" value={detail.detail.indent.indentId} mono />
                    <DRow label="Product"   value={detail.detail.indent.productName} />
                    <DRow label="DI No"     value={detail.detail.indent.diNo} />
                    <DRow label="Batch No"  value={detail.detail.indent.batchNo} />
                    <DRow label="Status"    value={detail.detail.indent.status} />
                  </DGrid>
                </DSection>
              )}

              {detail.detail?.sfg && (
                <DSection title="🧪 SFG Status">
                  <DGrid>
                    <DRow label="Formulated Qty" value={Number(detail.detail.sfg.formulatedQty).toFixed(2)} />
                    <DRow label="Packed Qty"     value={Number(detail.detail.sfg.packedQty).toFixed(2)} />
                    <DRow label="SFG Balance"    value={Number(detail.detail.sfg.sfgQty).toFixed(2)} />
                    <DRow label="SFG Status"     value={detail.detail.sfg.status} />
                  </DGrid>
                </DSection>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
