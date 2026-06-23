import { useRef } from 'react'
import MetaField from './MetaField.jsx'

const COMPANY = {
  name:     'SOM Phytopharma (India) Ltd',
  address:  'Plot No 154/A5-1, SVCIE, IDA Bollaram,',
  address2: 'Sangareddy Dist, Hyderabad, TS — 502325, India',
}

function grnNumber(grn) {
  return `GRN-${grn.invoiceNo?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'NOINV'}-${new Date(grn.createdAt).getFullYear()}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function GrnDetail({ selected, detail, loading }) {
  const printRef = useRef(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>GRN — ${detail?.invoiceNo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #1e293b; }
          .grn-wrap { max-width: 900px; margin: 0 auto; padding: 32px; }
          h1 { font-size: 20px; font-weight: 800; letter-spacing: 0.04em; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #0f172a; color: #f8fafc; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          tr:nth-child(even) td { background: #f8fafc; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head><body><div class="grn-wrap">${content}</div></body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  if (!selected) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <p className="text-5xl mb-4">☰</p>
        <p className="font-semibold text-gray-500 text-lg">Select a GRN from the left</p>
        <p className="text-sm mt-1">Preview and print Goods Received Notes</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading GRN…</div>
  }

  if (!detail) return null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-gray-900">{grnNumber(selected)}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{detail.supplier} — Invoice {detail.invoiceNo}</p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-900 transition flex items-center gap-2"
        >
          🖨️ Print GRN
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div ref={printRef}>
          {/* Letterhead */}
          <div style={{ borderBottom: '3px solid #0f172a', padding: '28px 32px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{COMPANY.name}</h1>
                <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{COMPANY.address}</p>
                <p style={{ fontSize: '11px', color: '#475569' }}>{COMPANY.address2}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em' }}>DOCUMENT</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e3a5f', marginTop: '2px' }}>GRN</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{grnNumber(selected)}</div>
              </div>
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ padding: '20px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', borderBottom: '1px solid #e2e8f0' }}>
            <MetaField label="Invoice No" value={detail.invoiceNo} />
            <MetaField label="Supplier" value={detail.supplier} />
            <MetaField label="Received Date" value={fmtDate(detail.receivedDate)} />
            <MetaField label="Total Bags" value={String(detail.totalPacks)} />
          </div>

          {/* Items table */}
          <div style={{ padding: '20px 32px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '12px' }}>RECEIVED ITEMS</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  {['#', 'Item Name', 'Item Code', 'Lot No', 'No. of Bags', 'Qty / Bag', 'Total Qty', 'UOM'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: ['#', 'No. of Bags', 'Qty / Bag', 'Total Qty'].includes(h) ? 'center' : 'left', color: '#f8fafc', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item, i) => (
                  <tr key={item.itemCode} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 1 ? '#f8fafc' : 'white' }}>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>{i + 1}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1e293b' }}>{item.itemName}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#3b82f6' }}>{item.itemCode}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11px' }}>{item.lotNo}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600 }}>{item.totalBags}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>{Number(item.packQty).toFixed(2)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{Number(item.totalQty).toFixed(2)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{item.uom}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={4} style={{ padding: '9px 12px', fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>TOTAL</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700 }}>{detail.totalPacks} bags</td>
                  <td />
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>{Number(detail.totalQty).toFixed(2)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          <div style={{ padding: '0 32px 16px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px' }}>
              Received in good condition. All quantities verified at the time of receipt.
            </p>
          </div>

          {/* Signature strip */}
          <div style={{ margin: '8px 32px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            {['Received By (Stores)', 'Verified By (QC)', 'Approved By (Manager)'].map(s => (
              <div key={s}>
                <div style={{ borderTop: '2px solid #1e293b', paddingTop: '6px', marginTop: '32px' }} />
                <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
