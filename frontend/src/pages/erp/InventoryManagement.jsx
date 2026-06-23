// /**
//  * Inventory Management — Stock Adjustments, Transfers, Decanting, FIFO, Stock Summary
//  */
// import { useState, useEffect, useCallback } from 'react'
// import { inventoryApi, gateApi } from '../../api/inventory.js'
// import { erpItemsApi, erpReasonCodesApi, erpPlantsApi, erpContainersApi } from '../../api/masters.js'
// import { useAuth } from '../../components/erp/AuthContext.jsx'

// const TABS = ['Stock Summary', 'Adjustments', 'Transfers', 'Decanting', 'FIFO Check']

// const badge = (color, text) => (
//   <span style={{
//     display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
//     background: color === 'green' ? '#dcfce7' : color === 'red' ? '#fee2e2' : color === 'amber' ? '#fef3c7' : color === 'blue' ? '#dbeafe' : '#f1f5f9',
//     color: color === 'green' ? '#166534' : color === 'red' ? '#991b1b' : color === 'amber' ? '#92400e' : color === 'blue' ? '#1e40af' : '#475569',
//   }}>{text}</span>
// )

// const inputStyle = {
//   width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px',
//   fontSize: '13px', boxSizing: 'border-box', outline: 'none',
// }
// const labelStyle = { display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }
// const btnPrimary = (disabled) => ({
//   padding: '9px 18px', background: disabled ? '#94a3b8' : '#1e3a5f', color: '#fff',
//   border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
// })
// const btnSuccess = { padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
// const btnDanger  = { padding: '7px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }

// // ─── Stock Summary ────────────────────────────────────────────────────────────
// function StockSummary() {
//   const [rows, setRows]       = useState([])
//   const [loading, setLoading] = useState(true)
//   const [search, setSearch]   = useState('')

//   useEffect(() => {
//     inventoryApi.stockSummary().then(r => setRows(r.data || [])).finally(() => setLoading(false))
//   }, [])

//   const filtered = rows.filter(r =>
//     r.item_code?.toLowerCase().includes(search.toLowerCase()) ||
//     r.item_name?.toLowerCase().includes(search.toLowerCase())
//   )

//   return (
//     <div>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
//         <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Current Stock Summary</h3>
//         <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item…"
//           style={{ ...inputStyle, width: '220px' }} />
//       </div>
//       {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading…</div> : (
//         <div style={{ overflowX: 'auto' }}>
//           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
//             <thead>
//               <tr style={{ background: '#f8fafc' }}>
//                 {['Item Code', 'Item Name', 'Category', 'Total Qty', 'UOM', 'Packs', 'Zone'].map(h => (
//                   <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.length === 0 ? (
//                 <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No stock data</td></tr>
//               ) : filtered.map((r, i) => (
//                 <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
//                   <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px' }}>{r.item_code}</td>
//                   <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.item_name}</td>
//                   <td style={{ padding: '10px 14px' }}>{r.item_category}</td>
//                   <td style={{ padding: '10px 14px', fontWeight: 700 }}>{Number(r.total_qty || 0).toFixed(2)}</td>
//                   <td style={{ padding: '10px 14px' }}>{r.uom}</td>
//                   <td style={{ padding: '10px 14px' }}>{String(r.pack_count ?? 0)}</td>
//                   <td style={{ padding: '10px 14px' }}>{r.warehouse_zone || '—'}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   )
// }

// // ─── Adjustments ──────────────────────────────────────────────────────────────
// function Adjustments() {
//   const { hasRole } = useAuth()
//   const canApprove = hasRole(['store_manager', 'admin'])

//   const [list, setList]             = useState([])
//   const [loading, setLoading]       = useState(true)
//   const [showForm, setShowForm]     = useState(false)
//   const [items, setItems]           = useState([])
//   const [reasons, setReasons]       = useState([])
//   const [packs, setPacks]           = useState([])
//   const [selectedPackQty, setSelectedPackQty] = useState(null)
//   const [form, setForm]             = useState({ item_code: '', pack_id: '', qty_change: '', reason_code: '', notes: '' })
//   const [saving, setSaving]         = useState(false)
//   const [error, setError]           = useState('')

//   const load = useCallback(() => {
//     setLoading(true)
//     inventoryApi.listAdj().then(r => setList(r.data || [])).finally(() => setLoading(false))
//   }, [])

//   useEffect(() => {
//     load()
//     erpItemsApi.list({ category: 'RM' }).then(r => setItems(r.data || []))
//     erpReasonCodesApi.list({ category: 'stock_adjustment' }).then(r => setReasons(r.data || []))
//   }, [load])

//   const onItemChange = async (code) => {
//     setForm(f => ({ ...f, item_code: code, pack_id: '' }))
//     setSelectedPackQty(null)
//     if (code) {
//       const r = await gateApi.packList({ item_code: code, status: 'active' })
//       setPacks(r.data || [])
//     } else setPacks([])
//   }

//   const onPackChange = (packId) => {
//     const pack = packs.find(p => p.pack_id === packId)
//     setSelectedPackQty(pack ? Number(pack.qty_remaining) : null)
//     setForm(f => ({ ...f, pack_id: packId }))
//   }

//   const submit = async () => {
//     if (!form.pack_id || !form.qty_change || !form.reason_code) { setError('Pack, qty change, and reason required'); return }
//     if (selectedPackQty === null) { setError('Select a valid pack'); return }
//     const qty_after = selectedPackQty + Number(form.qty_change)
//     if (qty_after < 0) { setError(`Cannot reduce below 0. Current qty: ${selectedPackQty}`); return }
//     setSaving(true); setError('')
//     try {
//       await inventoryApi.createAdj({ pack_id: form.pack_id, reason_code: form.reason_code, qty_after, notes: form.notes })
//       setShowForm(false)
//       setForm({ item_code: '', pack_id: '', qty_change: '', reason_code: '', notes: '' })
//       setSelectedPackQty(null)
//       load()
//     } catch (e) { setError(e.message) }
//     finally { setSaving(false) }
//   }

//   const approve = async (id) => {
//     try { await inventoryApi.approveAdj(id); load() }
//     catch (e) { alert(e.message) }
//   }
//   const reject = async (id) => {
//     const note = prompt('Rejection reason:')
//     if (!note) return
//     try { await inventoryApi.rejectAdj(id, { reason: note }); load() }
//     catch (e) { alert(e.message) }
//   }

//   return (
//     <div>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
//         <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Stock Adjustments</h3>
//         <button onClick={() => setShowForm(s => !s)} style={btnPrimary(false)}>{showForm ? 'Cancel' : '+ New Adjustment'}</button>
//       </div>

//       {showForm && (
//         <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
//           <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700 }}>Raise Stock Adjustment</h4>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
//             <div>
//               <label style={labelStyle}>ITEM</label>
//               <select value={form.item_code} onChange={e => onItemChange(e.target.value)} style={inputStyle}>
//                 <option value="">Select item…</option>
//                 {items.map(i => <option key={i.item_code} value={i.item_code}>{i.item_code} — {i.item_name}</option>)}
//               </select>
//             </div>
//             <div>
//               <label style={labelStyle}>PACK *</label>
//               <select value={form.pack_id} onChange={e => onPackChange(e.target.value)} style={inputStyle}>
//                 <option value="">Select pack…</option>
//                 {packs.map(p => <option key={p.pack_id} value={p.pack_id}>{p.lot_number} — {p.qty_remaining} {p.unit}</option>)}
//               </select>
//             </div>
//             <div>
//               <label style={labelStyle}>
//                 QTY CHANGE (+ or −) *
//                 {selectedPackQty !== null && (
//                   <span style={{ color: '#3b82f6', fontWeight: 400 }}> · current: {selectedPackQty}</span>
//                 )}
//               </label>
//               <input type="number" value={form.qty_change}
//                 onChange={e => setForm(f => ({ ...f, qty_change: e.target.value }))}
//                 placeholder="e.g. -5 or +10" style={inputStyle} />
//               {form.qty_change && selectedPackQty !== null && (
//                 <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
//                   New qty: <strong>{(selectedPackQty + Number(form.qty_change)).toFixed(2)}</strong>
//                 </div>
//               )}
//             </div>
//             <div>
//               <label style={labelStyle}>REASON CODE *</label>
//               <select value={form.reason_code} onChange={e => setForm(f => ({ ...f, reason_code: e.target.value }))} style={inputStyle}>
//                 <option value="">Select reason…</option>
//                 {reasons.map(r => <option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
//               </select>
//             </div>
//             <div style={{ gridColumn: 'span 2' }}>
//               <label style={labelStyle}>NOTES</label>
//               <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" style={inputStyle} />
//             </div>
//           </div>
//           {error && <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '12px' }}>{error}</div>}
//           <div style={{ marginTop: '14px' }}>
//             <button onClick={submit} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving…' : 'Submit for Approval'}</button>
//           </div>
//         </div>
//       )}

//       {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading…</div> : (
//         <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
//           <thead>
//             <tr style={{ background: '#f8fafc' }}>
//               {['Item / Pack', 'Qty Change', 'Reason', 'Raised By', 'Status', 'Actions'].map(h => (
//                 <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {list.length === 0 ? (
//               <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No adjustments</td></tr>
//             ) : list.map(a => (
//               <tr key={a.adjustment_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
//                 <td style={{ padding: '10px 14px' }}>
//                   <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{a.lot_number}</div>
//                   <div style={{ fontSize: '11px', color: '#94a3b8' }}>{a.item_code}</div>
//                 </td>
//                 <td style={{ padding: '10px 14px', fontWeight: 700, color: Number(a.delta) >= 0 ? '#16a34a' : '#dc2626' }}>
//                   {Number(a.delta) >= 0 ? '+' : ''}{Number(a.delta).toFixed(2)}
//                 </td>
//                 <td style={{ padding: '10px 14px' }}>{a.reason_code}</td>
//                 <td style={{ padding: '10px 14px' }}>{a.raised_by_name || '—'}</td>
//                 <td style={{ padding: '10px 14px' }}>
//                   {a.status === 'pending' ? badge('amber', 'Pending') : a.status === 'approved' ? badge('green', 'Approved') : badge('red', 'Rejected')}
//                 </td>
//                 <td style={{ padding: '10px 14px' }}>
//                   {a.status === 'pending' && canApprove && (
//                     <div style={{ display: 'flex', gap: '6px' }}>
//                       <button onClick={() => approve(a.adjustment_id)} style={btnSuccess}>✓ Approve</button>
//                       <button onClick={() => reject(a.adjustment_id)} style={btnDanger}>✕ Reject</button>
//                     </div>
//                   )}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   )
// }

// // ─── Transfers ────────────────────────────────────────────────────────────────
// function Transfers() {
//   const [list, setList]         = useState([])
//   const [loading, setLoading]   = useState(true)
//   const [showForm, setShowForm] = useState(false)
//   const [packs, setPacks]       = useState([])
//   const [plants, setPlants]     = useState([])
//   const [form, setForm]         = useState({ pack_id: '', transfer_type: 'intra_plant', to_plant_id: '', to_location: '', notes: '' })
//   const [packSearch, setPackSearch] = useState('')
//   const [saving, setSaving]     = useState(false)
//   const [error, setError]       = useState('')

//   const load = useCallback(() => {
//     setLoading(true)
//     inventoryApi.listTransfers().then(r => setList(r.data || [])).finally(() => setLoading(false))
//   }, [])

//   useEffect(() => {
//     load()
//     erpPlantsApi.list().then(r => setPlants(r.data || []))
//   }, [load])

//   const searchPacks = async () => {
//     if (!packSearch) return
//     const r = await gateApi.packList({ item_code: packSearch, status: 'active' })
//     setPacks(r.data || [])
//   }

//   const submit = async () => {
//     if (!form.pack_id) { setError('Select a pack'); return }
//     setSaving(true); setError('')
//     try {
//       await inventoryApi.createTransfer(form)
//       setShowForm(false)
//       setForm({ pack_id: '', transfer_type: 'intra_plant', to_plant_id: '', to_location: '', notes: '' })
//       load()
//     } catch (e) { setError(e.message) }
//     finally { setSaving(false) }
//   }

//   const receive = async (id) => {
//     try { await inventoryApi.receiveTransfer(id); load() }
//     catch (e) { alert(e.message) }
//   }

//   return (
//     <div>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
//         <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Stock Transfers</h3>
//         <button onClick={() => setShowForm(s => !s)} style={btnPrimary(false)}>{showForm ? 'Cancel' : '+ New Transfer'}</button>
//       </div>

//       {showForm && (
//         <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
//           <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700 }}>Create Transfer</h4>
//           <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
//             <div style={{ flex: 1 }}>
//               <label style={labelStyle}>SEARCH PACKS BY ITEM CODE</label>
//               <input value={packSearch} onChange={e => setPackSearch(e.target.value)}
//                 onKeyDown={e => e.key === 'Enter' && searchPacks()}
//                 placeholder="Enter item code and press Enter" style={inputStyle} />
//             </div>
//             <button onClick={searchPacks} style={{ ...btnPrimary(false), whiteSpace: 'nowrap' }}>Search</button>
//           </div>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
//             <div>
//               <label style={labelStyle}>SELECT PACK *</label>
//               <select value={form.pack_id} onChange={e => setForm(f => ({ ...f, pack_id: e.target.value }))} style={inputStyle}>
//                 <option value="">Select pack…</option>
//                 {packs.map(p => <option key={p.pack_id} value={p.pack_id}>{p.lot_number} — {p.qty_remaining} {p.unit} @ {p.location || '?'}</option>)}
//               </select>
//             </div>
//             <div>
//               <label style={labelStyle}>TYPE</label>
//               <select value={form.transfer_type} onChange={e => setForm(f => ({ ...f, transfer_type: e.target.value }))} style={inputStyle}>
//                 <option value="intra_plant">Intra-Plant (same plant)</option>
//                 <option value="inter_plant">Inter-Plant (different plant)</option>
//               </select>
//             </div>
//             {form.transfer_type === 'inter_plant' ? (
//               <div>
//                 <label style={labelStyle}>DESTINATION PLANT</label>
//                 <select value={form.to_plant_id} onChange={e => setForm(f => ({ ...f, to_plant_id: e.target.value }))} style={inputStyle}>
//                   <option value="">Select plant…</option>
//                   {plants.map(p => <option key={p.plant_id} value={p.plant_id}>{p.plant_name}</option>)}
//                 </select>
//               </div>
//             ) : (
//               <div>
//                 <label style={labelStyle}>NEW LOCATION</label>
//                 <input value={form.to_location} onChange={e => setForm(f => ({ ...f, to_location: e.target.value }))} placeholder="e.g. Bay-3, Rack-B2" style={inputStyle} />
//               </div>
//             )}
//             <div style={{ gridColumn: 'span 3' }}>
//               <label style={labelStyle}>NOTES</label>
//               <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" style={inputStyle} />
//             </div>
//           </div>
//           {error && <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '12px' }}>{error}</div>}
//           <div style={{ marginTop: '14px' }}>
//             <button onClick={submit} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving…' : 'Create Transfer'}</button>
//           </div>
//         </div>
//       )}

//       {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading…</div> : (
//         <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
//           <thead>
//             <tr style={{ background: '#f8fafc' }}>
//               {['Pack / Item', 'Type', 'From', 'To', 'Initiated By', 'Status', 'Action'].map(h => (
//                 <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {list.length === 0 ? (
//               <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No transfers</td></tr>
//             ) : list.map(t => (
//               <tr key={t.transfer_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
//                 <td style={{ padding: '10px 14px' }}>
//                   <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{t.lot_number}</div>
//                   <div style={{ color: '#64748b', fontSize: '11px' }}>{t.item_code}</div>
//                 </td>
//                 <td style={{ padding: '10px 14px' }}>{t.transfer_type === 'intra_plant' ? badge('blue', 'Intra-Plant') : badge('amber', 'Inter-Plant')}</td>
//                 <td style={{ padding: '10px 14px', fontSize: '12px' }}>{t.from_location || '—'}</td>
//                 <td style={{ padding: '10px 14px', fontSize: '12px' }}>{t.to_location || '—'}</td>
//                 <td style={{ padding: '10px 14px' }}>{t.initiated_by_name || '—'}</td>
//                 <td style={{ padding: '10px 14px' }}>
//                   {t.status === 'pending' ? badge('amber', 'Pending') : t.status === 'completed' ? badge('green', 'Completed') : badge('slate', t.status)}
//                 </td>
//                 <td style={{ padding: '10px 14px' }}>
//                   {t.status === 'pending' && t.transfer_type === 'inter_plant' && (
//                     <button onClick={() => receive(t.transfer_id)} style={btnSuccess}>Confirm Receipt</button>
//                   )}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   )
// }

// // ─── Decanting ────────────────────────────────────────────────────────────────
// function Decanting() {
//   const [list, setList]         = useState([])
//   const [loading, setLoading]   = useState(true)
//   const [showForm, setShowForm] = useState(false)
//   const [packs, setPacks]       = useState([])
//   const [containers, setContainers] = useState([])
//   // form keys match backend: source_pack_id, target_container_id, qty_to_transfer
//   const [form, setForm] = useState({
//     source_pack_id: '', target_container_id: '', qty_to_transfer: '', notes: '', supervisor_approved: false
//   })
//   const [packItemCode, setPackItemCode] = useState('')
//   const [saving, setSaving]     = useState(false)
//   const [error, setError]       = useState('')

//   const load = useCallback(() => {
//     setLoading(true)
//     inventoryApi.listDecanting().then(r => setList(r.data || [])).finally(() => setLoading(false))
//   }, [])

//   useEffect(() => { load() }, [load])

//   const searchPacks = async () => {
//     if (!packItemCode) return
//     const [pr, cr] = await Promise.all([
//       gateApi.packList({ item_code: packItemCode, status: 'active' }),
//       erpContainersApi.list({ item_code: packItemCode }),
//     ])
//     setPacks(pr.data || [])
//     setContainers(cr.data || [])
//   }

//   const submit = async () => {
//     if (!form.source_pack_id || !form.target_container_id || !form.qty_to_transfer) {
//       setError('Pack, container, and qty required'); return
//     }
//     setSaving(true); setError('')
//     try {
//       await inventoryApi.decant(form)
//       setShowForm(false)
//       setForm({ source_pack_id: '', target_container_id: '', qty_to_transfer: '', notes: '', supervisor_approved: false })
//       load()
//     } catch (e) {
//       const msg = e.message
//       setError(msg)
//       if (e.response?.status === 422) {
//         const ok = window.confirm(`Tolerance exceeded: ${msg}\n\nDo you have supervisor approval to proceed?`)
//         if (ok) setForm(f => ({ ...f, supervisor_approved: true }))
//       }
//     }
//     finally { setSaving(false) }
//   }

//   return (
//     <div>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
//         <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Decanting / Pack Splitting</h3>
//         <button onClick={() => setShowForm(s => !s)} style={btnPrimary(false)}>{showForm ? 'Cancel' : '+ New Decanting'}</button>
//       </div>

//       {showForm && (
//         <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
//           <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700 }}>Decant Pack into Container</h4>
//           <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
//             <div style={{ flex: 1 }}>
//               <label style={labelStyle}>ITEM CODE (to find packs &amp; containers)</label>
//               <input value={packItemCode} onChange={e => setPackItemCode(e.target.value)}
//                 onKeyDown={e => e.key === 'Enter' && searchPacks()}
//                 placeholder="e.g. CIT-001" style={inputStyle} />
//             </div>
//             <button onClick={searchPacks} style={{ ...btnPrimary(false), whiteSpace: 'nowrap' }}>Search</button>
//           </div>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
//             <div>
//               <label style={labelStyle}>SOURCE PACK *</label>
//               <select value={form.source_pack_id} onChange={e => setForm(f => ({ ...f, source_pack_id: e.target.value }))} style={inputStyle}>
//                 <option value="">Select pack…</option>
//                 {packs.map(p => <option key={p.pack_id} value={p.pack_id}>{p.lot_number} — {p.qty_remaining} {p.unit}</option>)}
//               </select>
//             </div>
//             <div>
//               <label style={labelStyle}>TARGET CONTAINER *</label>
//               <select value={form.target_container_id} onChange={e => setForm(f => ({ ...f, target_container_id: e.target.value }))} style={inputStyle}>
//                 <option value="">Select container…</option>
//                 {containers.map(c => <option key={c.container_id} value={c.container_id}>{c.container_id} (cap: {c.max_capacity} {c.uom})</option>)}
//               </select>
//             </div>
//             <div>
//               <label style={labelStyle}>QTY TO DECANT *</label>
//               <input type="number" value={form.qty_to_transfer}
//                 onChange={e => setForm(f => ({ ...f, qty_to_transfer: e.target.value }))}
//                 placeholder="Qty" style={inputStyle} />
//             </div>
//             <div style={{ gridColumn: 'span 2' }}>
//               <label style={labelStyle}>NOTES</label>
//               <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" style={inputStyle} />
//             </div>
//             <div style={{ display: 'flex', alignItems: 'flex-end' }}>
//               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
//                 <input type="checkbox" checked={form.supervisor_approved}
//                   onChange={e => setForm(f => ({ ...f, supervisor_approved: e.target.checked }))} />
//                 Supervisor Approved (tolerance override)
//               </label>
//             </div>
//           </div>
//           {error && <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '12px' }}>{error}</div>}
//           <div style={{ marginTop: '14px' }}>
//             <button onClick={submit} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving…' : 'Record Decanting'}</button>
//           </div>
//         </div>
//       )}

//       {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading…</div> : (
//         <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
//           <thead>
//             <tr style={{ background: '#f8fafc' }}>
//               {['Source Pack', 'Container', 'Qty Decanted', 'Performed By', 'Date', 'Supervisor Appvd'].map(h => (
//                 <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {list.length === 0 ? (
//               <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No records</td></tr>
//             ) : list.map(d => (
//               <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
//                 <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px' }}>{d.lot_number}</td>
//                 <td style={{ padding: '10px 14px' }}>{d.target_container}</td>
//                 <td style={{ padding: '10px 14px', fontWeight: 600 }}>{Number(d.qty_actual || 0).toFixed(2)} {d.unit}</td>
//                 <td style={{ padding: '10px 14px' }}>{d.performed_by_name}</td>
//                 <td style={{ padding: '10px 14px' }}>{d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN') : '—'}</td>
//                 <td style={{ padding: '10px 14px' }}>{d.approved_by ? badge('green', 'Yes') : badge('slate', 'No')}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   )
// }

// // ─── FIFO Check ───────────────────────────────────────────────────────────────
// // Uses the pack list (already FIFO-sorted by inward_date ASC) to show the
// // correct next-to-issue lot, and lets managers log an override if needed.
// function FifoCheck() {
//   const { hasRole } = useAuth()
//   const canOverride = hasRole(['store_manager', 'admin'])

//   const [itemCode, setItemCode]   = useState('')
//   const [packs, setPacks]         = useState([])
//   const [hasSearched, setHasSearched] = useState(false)
//   const [checking, setChecking]   = useState(false)
//   const [reasons, setReasons]     = useState([])
//   const [overrideForm, setOverrideForm] = useState({ show: false, selected_pack_id: '', reason: '' })

//   useEffect(() => {
//     erpReasonCodesApi.list({ category: 'fifo_override' }).then(r => setReasons(r.data || []))
//   }, [])

//   const check = async () => {
//     if (!itemCode) return
//     setChecking(true); setHasSearched(true)
//     try {
//       // packList is sorted ASC by inward_date — first result = oldest = FIFO correct
//       const r = await gateApi.packList({ item_code: itemCode })
//       setPacks(r.data || [])
//     } catch (e) { alert(e.message) }
//     finally { setChecking(false) }
//   }

//   const oldest = packs[0]

//   const submitOverride = async () => {
//     if (!overrideForm.selected_pack_id) { alert('Select the pack you intend to use instead'); return }
//     if (!overrideForm.reason) { alert('Reason required for FIFO override'); return }
//     const selected = packs.find(p => p.pack_id === overrideForm.selected_pack_id)
//     try {
//       await inventoryApi.fifoOverride({
//         item_code: itemCode,
//         older_lot:    oldest?.lot_number,
//         older_qty:    oldest?.qty_remaining,
//         selected_lot: selected?.lot_number,
//         reason:       overrideForm.reason,
//       })
//       setOverrideForm({ show: false, selected_pack_id: '', reason: '' })
//       alert('FIFO override logged. You may proceed with the selected lot.')
//     } catch (e) { alert(e.message) }
//   }

//   return (
//     <div>
//       <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>FIFO Verification</h3>
//       <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#1e40af' }}>
//         <strong>Hard FIFO Enforcement:</strong> Issuance always uses the oldest available pack.
//         Manager override is required and logged in the audit trail.
//       </div>

//       <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
//         <input value={itemCode} onChange={e => setItemCode(e.target.value)}
//           onKeyDown={e => e.key === 'Enter' && check()}
//           placeholder="Enter item code to check FIFO status…"
//           style={{ ...inputStyle, flex: 1 }} />
//         <button onClick={check} disabled={checking || !itemCode} style={btnPrimary(!itemCode)}>
//           {checking ? 'Checking…' : 'Check FIFO'}
//         </button>
//       </div>

//       {hasSearched && packs.length === 0 && !checking && (
//         <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
//           No active packs found for this item code.
//         </div>
//       )}

//       {packs.length > 0 && (
//         <div>
//           {/* FIFO-correct pack highlight */}
//           <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
//             <div style={{ fontSize: '15px', fontWeight: 700, color: '#166534', marginBottom: '12px' }}>
//               ✓ FIFO — Next Correct Pack to Issue
//             </div>
//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', fontSize: '13px' }}>
//               <div>
//                 <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>LOT NUMBER</div>
//                 <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{oldest.lot_number}</div>
//               </div>
//               <div>
//                 <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>INWARD DATE</div>
//                 <div>{oldest.inward_date ? new Date(oldest.inward_date).toLocaleDateString('en-IN') : '—'}</div>
//               </div>
//               <div>
//                 <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>QTY AVAILABLE</div>
//                 <div style={{ fontWeight: 700 }}>{Number(oldest.qty_remaining).toFixed(2)} {oldest.unit}</div>
//               </div>
//               <div>
//                 <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>LOCATION</div>
//                 <div>{oldest.location || '—'}</div>
//               </div>
//             </div>
//           </div>

//           {/* All packs in FIFO order */}
//           {packs.length > 1 && (
//             <div style={{ marginBottom: '16px' }}>
//               <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
//                 All Available Packs — FIFO Order
//               </div>
//               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
//                 <thead>
//                   <tr style={{ background: '#f8fafc' }}>
//                     {['#', 'Lot Number', 'Inward Date', 'Qty Remaining', 'Location', 'Status'].map(h => (
//                       <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {packs.map((p, i) => (
//                     <tr key={p.pack_id} style={{ borderBottom: '1px solid #f1f5f9', background: i === 0 ? '#f0fdf4' : 'transparent' }}>
//                       <td style={{ padding: '8px 12px', color: '#64748b' }}>{i + 1}</td>
//                       <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
//                         {p.lot_number}
//                         {i === 0 && (
//                           <span style={{ marginLeft: '6px', fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '10px', fontFamily: 'sans-serif', fontWeight: 700 }}>FIFO</span>
//                         )}
//                       </td>
//                       <td style={{ padding: '8px 12px' }}>{p.inward_date ? new Date(p.inward_date).toLocaleDateString('en-IN') : '—'}</td>
//                       <td style={{ padding: '8px 12px', fontWeight: 600 }}>{Number(p.qty_remaining).toFixed(2)} {p.unit}</td>
//                       <td style={{ padding: '8px 12px' }}>{p.location || '—'}</td>
//                       <td style={{ padding: '8px 12px' }}>{badge(p.status === 'active' ? 'green' : 'amber', p.status)}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {/* Manager override */}
//           {packs.length > 1 && canOverride && (
//             <div>
//               {!overrideForm.show ? (
//                 <button onClick={() => setOverrideForm(f => ({ ...f, show: true }))}
//                   style={{ padding: '8px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
//                   Log FIFO Override (Manager)
//                 </button>
//               ) : (
//                 <div style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: '8px', padding: '16px' }}>
//                   <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
//                     Log FIFO Override — Manager Authorization Required
//                   </h4>
//                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
//                     <div>
//                       <label style={labelStyle}>PACK TO USE INSTEAD *</label>
//                       <select value={overrideForm.selected_pack_id}
//                         onChange={e => setOverrideForm(f => ({ ...f, selected_pack_id: e.target.value }))}
//                         style={inputStyle}>
//                         <option value="">Select non-FIFO pack…</option>
//                         {packs.slice(1).map(p => (
//                           <option key={p.pack_id} value={p.pack_id}>
//                             {p.lot_number} — {Number(p.qty_remaining).toFixed(2)} {p.unit} (rcvd {p.inward_date ? new Date(p.inward_date).toLocaleDateString('en-IN') : '?'})
//                           </option>
//                         ))}
//                       </select>
//                     </div>
//                     <div>
//                       <label style={labelStyle}>REASON FOR OVERRIDE *</label>
//                       <select value={overrideForm.reason}
//                         onChange={e => setOverrideForm(f => ({ ...f, reason: e.target.value }))}
//                         style={inputStyle}>
//                         <option value="">Select reason…</option>
//                         {reasons.map(r => <option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
//                         <option value="URGENT_PRODUCTION">URGENT_PRODUCTION — Urgent production requirement</option>
//                         <option value="QUALITY_HOLD">QUALITY_HOLD — Older lot on quality hold</option>
//                         <option value="MANAGER_DISCRETION">MANAGER_DISCRETION — Manager discretion</option>
//                       </select>
//                     </div>
//                   </div>
//                   <div style={{ display: 'flex', gap: '8px' }}>
//                     <button onClick={submitOverride}
//                       style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
//                       Confirm Override
//                     </button>
//                     <button onClick={() => setOverrideForm({ show: false, selected_pack_id: '', reason: '' })}
//                       style={{ padding: '8px 16px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
//                       Cancel
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────
// export default function InventoryManagement() {
//   const [tab, setTab] = useState(0)

//   return (
//     <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
//       <div style={{ marginBottom: '24px' }}>
//         <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Inventory Management</h1>
//         <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Stock adjustments, transfers, decanting and FIFO control</p>
//       </div>

//       <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
//         {TABS.map((t, i) => (
//           <button key={t} onClick={() => setTab(i)} style={{
//             padding: '8px 16px', border: 'none', borderRadius: '7px', cursor: 'pointer',
//             fontSize: '13px', fontWeight: 600,
//             background: tab === i ? '#fff' : 'transparent',
//             color: tab === i ? '#1e293b' : '#64748b',
//             boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
//           }}>{t}</button>
//         ))}
//       </div>

//       <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
//         {tab === 0 && <StockSummary />}
//         {tab === 1 && <Adjustments />}
//         {tab === 2 && <Transfers />}
//         {tab === 3 && <Decanting />}
//         {tab === 4 && <FifoCheck />}
//       </div>
//     </div>
//   )
// }
