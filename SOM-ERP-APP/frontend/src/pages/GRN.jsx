import { useState, useEffect, useRef } from 'react'
import { grnApi } from '../api/client.js'

const COMPANY = {
  name: 'SOM Phytopharma (India) Ltd',
  address: 'Plot No 154/A5-1, SVCIE, IDA Bollaram,',
  address2: 'Sangareddy Dist, Hyderabad, TS — 502325, India',
  phone: '',
  gstin: '',
}

export default function GRN() {
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)       // { invoiceNo, supplier }
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const printRef = useRef(null)

  useEffect(() => { loadList() }, [])

  const loadList = async () => {
    setLoading(true)
    try {
      const res = await grnApi.list()
      setList(res.data || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const loadDetail = async (grn) => {
    setSelected(grn)
    setDetail(null)
    setLoadingDetail(true)
    try {
      const res = await grnApi.detail(grn.invoiceNo, grn.supplier)
      setDetail(res.data)
    } catch (e) {
      alert('Failed to load GRN: ' + e.message)
    }
    setLoadingDetail(false)
  }

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
          .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .label { font-size: 10px; color: #64748b; font-weight: 600; letter-spacing: 0.06em; margin-bottom: 2px; }
          .value { font-size: 13px; font-weight: 600; }
          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
          .footer { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .sig-box { border-top: 2px solid #1e293b; padding-top: 8px; font-size: 11px; color: #64748b; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head><body><div class="grn-wrap">${content}</div></body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const grnNumber = (grn) =>
    `GRN-${grn.invoiceNo?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'NOINV'}-${new Date(grn.createdAt).getFullYear()}`

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>

      {/* ── Left: GRN list ── */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b bg-gray-50 sticky top-0 z-10">
          <h2 className="font-bold text-gray-900 text-sm mb-2">Goods Received Notes</h2>
          <input
            type="text"
            placeholder="Search by item, invoice, supplier…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            No GRNs yet. Add Invoice No to packs in Print Master first.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {list.filter(grn => {
              if (!search.trim()) return true
              const q = search.toLowerCase()
              return (grn.invoiceNo || '').toLowerCase().includes(q) ||
                (grn.supplier || '').toLowerCase().includes(q) ||
                (grn.items || []).some(i => i.toLowerCase().includes(q))
            }).map((grn) => (
              <button
                key={grn.grnKey}
                onClick={() => loadDetail(grn)}
                className={`w-full text-left px-5 py-3.5 transition hover:bg-indigo-50
                  ${selected?.grnKey === grn.grnKey ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{grn.invoiceNo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{grn.supplier}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                    {grn.totalPacks} bags
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-gray-400 mt-1.5">
                  <span>{grn.uniqueItems} item{grn.uniqueItems !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{grn.receivedDate ? fmtDate(grn.receivedDate) : fmtDate(grn.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: GRN detail + print ── */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {!selected && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p className="text-5xl mb-4">☰</p>
            <p className="font-semibold text-gray-500 text-lg">Select a GRN from the left</p>
            <p className="text-sm mt-1">Preview and print Goods Received Notes</p>
          </div>
        )}

        {loadingDetail && (
          <div className="flex items-center justify-center h-40 text-gray-400">Loading GRN…</div>
        )}

        {detail && !loadingDetail && (
          <div className="max-w-3xl">
            {/* Toolbar */}
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

            {/* Printable GRN card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div ref={printRef}>
                {/* Letterhead */}
                <div style={{ borderBottom: '3px solid #0f172a', padding: '28px 32px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                        {COMPANY.name}
                      </h1>
                      <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{COMPANY.address}</p>
                      <p style={{ fontSize: '11px', color: '#475569' }}>{COMPANY.address2}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em' }}>DOCUMENT</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e3a5f', marginTop: '2px' }}>GRN</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                        {grnNumber(selected)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRN meta grid */}
                <div style={{ padding: '20px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', borderBottom: '1px solid #e2e8f0' }}>
                  <MetaField label="Invoice No" value={detail.invoiceNo} />
                  <MetaField label="Supplier" value={detail.supplier} />
                  <MetaField label="Received Date" value={fmtDate(detail.receivedDate)} />
                  <MetaField label="Total Bags" value={String(detail.totalPacks)} />
                </div>

                {/* Items summary table */}
                <div style={{ padding: '20px 32px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '12px' }}>
                    RECEIVED ITEMS
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#0f172a' }}>
                        {['#', 'Item Name', 'Item Code', 'Lot No', 'No. of Bags', 'Qty / Bag', 'Total Qty', 'UOM'].map(h => (
                          <th key={h} style={{
                            padding: '9px 12px', textAlign: h === '#' || h === 'No. of Bags' || h === 'Qty / Bag' || h === 'Total Qty' ? 'center' : 'left',
                            color: '#f8fafc', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em'
                          }}>{h}</th>
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
                      {/* Totals row */}
                      <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                        <td colSpan={4} style={{ padding: '9px 12px', fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>
                          TOTAL
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700 }}>
                          {detail.totalPacks} bags
                        </td>
                        <td />
                        <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                          {Number(detail.totalQty).toFixed(2)}
                        </td>
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
        )}
      </div>
    </div>
  )
}

function MetaField({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '3px' }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{value || '—'}</p>
    </div>
  )
}
