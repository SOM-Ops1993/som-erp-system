// /**
//  * Sales Orders — list, create, status transitions, dispatch, at-risk alerts
//  */
// import { useState, useEffect, useCallback } from 'react'
// import { salesApi } from '../../api/sales.js'
// import { erpProductsApi, erpCustomersApi, erpPlantsApi } from '../../api/masters.js'
// import { useAuth } from '../../components/erp/AuthContext.jsx'

// const STATUS_COLORS = {
//   new: 'slate', confirmed: 'blue', at_risk: 'amber', in_production: 'purple',
//   dispatched: 'green', cancelled: 'red',
// }
// const STATUS_LABELS = {
//   new: 'New', confirmed: 'Confirmed', at_risk: 'At Risk', in_production: 'In Production',
//   dispatched: 'Dispatched', cancelled: 'Cancelled',
// }

// const badge = (status) => {
//   const c = STATUS_COLORS[status] || 'slate'
//   const bg = { green: '#dcfce7', red: '#fee2e2', amber: '#fef3c7', blue: '#dbeafe', slate: '#f1f5f9', purple: '#f3e8ff' }[c]
//   const tx = { green: '#166534', red: '#991b1b', amber: '#92400e', blue: '#1e40af', slate: '#475569', purple: '#6b21a8' }[c]
//   return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: bg, color: tx }}>{STATUS_LABELS[status] || status}</span>
// }

// const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }
// const labelStyle = { display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }
// const btnPrimary = (disabled) => ({ padding: '9px 18px', background: disabled ? '#94a3b8' : '#1e3a5f', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer' })

// // ─── Order Detail Drawer ──────────────────────────────────────────────────────
// function OrderDetail({ order, onClose, onRefresh }) {
//   const { hasRole } = useAuth()
//   const [dispatchForm, setDispatchForm] = useState({ show: false, qty_dispatched: '', vehicle_no: '', driver_name: '', lr_number: '', notes: '' })
//   const [saving, setSaving] = useState(false)

//   const canConfirm = hasRole(['sales_team', 'admin']) && order.status === 'new'
//   const canDispatch = hasRole(['store_person', 'store_manager', 'admin']) && ['confirmed', 'in_production', 'at_risk'].includes(order.status)
//   const canCancel = hasRole(['admin', 'sales_team']) && !['dispatched', 'cancelled'].includes(order.status)

//   const updateStatus = async (status) => {
//     setSaving(true)
//     try {
//       await salesApi.update(order.di_number, { status })
//       onRefresh()
//     } catch (e) { alert(e.response?.data?.error || e.message) }
//     finally { setSaving(false) }
//   }

//   const submitDispatch = async () => {
//     if (!dispatchForm.qty_dispatched) { alert('Qty dispatched required'); return }
//     setSaving(true)
//     try {
//       await salesApi.dispatch(order.di_number, dispatchForm)
//       onRefresh()
//     } catch (e) { alert(e.response?.data?.error || e.message) }
//     finally { setSaving(false) }
//   }

//   return (
//     <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
//       <div style={{ width: '520px', background: '#fff', height: '100%', overflowY: 'auto', padding: '28px', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
//           <div>
//             <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{order.di_number}</div>
//             <div style={{ marginTop: '4px' }}>{badge(order.status)}</div>
//           </div>
//           <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}>✕</button>
//         </div>

//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px', fontSize: '13px' }}>
//           <div><div style={labelStyle}>CUSTOMER</div><div style={{ fontWeight: 600 }}>{order.customer_name}</div></div>
//           <div><div style={labelStyle}>PRODUCT</div><div style={{ fontWeight: 600 }}>{order.product_name}</div></div>
//           <div><div style={labelStyle}>ORDER DATE</div><div>{order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN') : '—'}</div></div>
//           <div><div style={labelStyle}>ETD</div><div style={{ color: order.status === 'at_risk' ? '#dc2626' : '#1e293b', fontWeight: order.status === 'at_risk' ? 700 : 400 }}>
//             {order.etd ? new Date(order.etd).toLocaleDateString('en-IN') : '—'}
//           </div></div>
//           <div><div style={labelStyle}>QTY ORDERED</div><div style={{ fontWeight: 700 }}>{order.qty_ordered} {order.uom}</div></div>
//           <div><div style={labelStyle}>PLANT</div><div>{order.plant_name || '—'}</div></div>
//           {order.notes && <div style={{ gridColumn: 'span 2' }}><div style={labelStyle}>NOTES</div><div style={{ color: '#475569' }}>{order.notes}</div></div>}
//         </div>

//         {/* Actions */}
//         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
//           {canConfirm && (
//             <button onClick={() => updateStatus('confirmed')} disabled={saving} style={{ padding: '9px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
//               ✓ Confirm Order
//             </button>
//           )}
//           {canDispatch && !dispatchForm.show && (
//             <button onClick={() => setDispatchForm(f => ({ ...f, show: true }))} style={{ padding: '9px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
//               🚚 Record Dispatch
//             </button>
//           )}
//           {canCancel && (
//             <button onClick={() => { if (window.confirm('Cancel this order?')) updateStatus('cancelled') }} style={{ padding: '9px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
//               Cancel Order
//             </button>
//           )}
//         </div>

//         {/* Dispatch Form */}
//         {dispatchForm.show && (
//           <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
//             <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#166534' }}>Record Dispatch</h4>
//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
//               <div><label style={labelStyle}>QTY DISPATCHED *</label><input type="number" value={dispatchForm.qty_dispatched} onChange={e => setDispatchForm(f => ({ ...f, qty_dispatched: e.target.value }))} style={inputStyle} /></div>
//               <div><label style={labelStyle}>VEHICLE NO.</label><input value={dispatchForm.vehicle_no} onChange={e => setDispatchForm(f => ({ ...f, vehicle_no: e.target.value }))} placeholder="e.g. TN01AB1234" style={inputStyle} /></div>
//               <div><label style={labelStyle}>DRIVER NAME</label><input value={dispatchForm.driver_name} onChange={e => setDispatchForm(f => ({ ...f, driver_name: e.target.value }))} style={inputStyle} /></div>
//               <div><label style={labelStyle}>LR NUMBER</label><input value={dispatchForm.lr_number} onChange={e => setDispatchForm(f => ({ ...f, lr_number: e.target.value }))} style={inputStyle} /></div>
//               <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>NOTES</label><input value={dispatchForm.notes} onChange={e => setDispatchForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} /></div>
//             </div>
//             <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
//               <button onClick={submitDispatch} disabled={saving} style={{ padding: '9px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
//                 {saving ? 'Saving…' : 'Confirm Dispatch'}
//               </button>
//               <button onClick={() => setDispatchForm(f => ({ ...f, show: false }))} style={{ padding: '9px 14px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
//             </div>
//           </div>
//         )}

//         {/* Dispatch History */}
//         {order.dispatches?.length > 0 && (
//           <div>
//             <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>DISPATCH HISTORY</div>
//             {order.dispatches.map(d => (
//               <div key={d.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '8px', fontSize: '12px' }}>
//                 <div style={{ fontWeight: 600 }}>{d.qty_dispatched} {order.uom} — {d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-IN') : '—'}</div>
//                 <div style={{ color: '#64748b', marginTop: '2px' }}>{d.vehicle_no} {d.driver_name ? `• ${d.driver_name}` : ''} {d.lr_number ? `• LR: ${d.lr_number}` : ''}</div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// // ─── Create Form ──────────────────────────────────────────────────────────────
// function CreateOrderForm({ onCreated, onCancel }) {
//   const [products, setProducts] = useState([])
//   const [customers, setCustomers] = useState([])
//   const [plants, setPlants] = useState([])
//   const [form, setForm] = useState({ di_number: '', product_id: '', customer_id: '', plant_id: '', qty_ordered: '', uom: 'kg', order_date: new Date().toISOString().slice(0, 10), etd: '', notes: '' })
//   const [saving, setSaving] = useState(false)
//   const [error, setError] = useState('')

//   useEffect(() => {
//     erpProductsApi.list().then(r => setProducts(r.data || []))
//     erpCustomersApi.list().then(r => setCustomers(r.data || []))
//     erpPlantsApi.list().then(r => setPlants(r.data || []))
//   }, [])

//   const submit = async () => {
//     if (!form.di_number || !form.product_id || !form.customer_id || !form.qty_ordered || !form.etd) {
//       setError('DI number, product, customer, qty, and ETD are required')
//       return
//     }
//     setSaving(true); setError('')
//     try {
//       await salesApi.create(form)
//       onCreated()
//     } catch (e) { setError(e.response?.data?.error || e.message) }
//     finally { setSaving(false) }
//   }

//   return (
//     <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
//       <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>New Sales Order</h3>
//       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
//         <div><label style={labelStyle}>DI / ORDER NUMBER *</label><input value={form.di_number} onChange={e => setForm(f => ({ ...f, di_number: e.target.value }))} placeholder="e.g. DI-2026-001" style={inputStyle} /></div>
//         <div><label style={labelStyle}>PRODUCT *</label>
//           <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} style={inputStyle}>
//             <option value="">Select product…</option>
//             {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
//           </select>
//         </div>
//         <div><label style={labelStyle}>CUSTOMER *</label>
//           <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} style={inputStyle}>
//             <option value="">Select customer…</option>
//             {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
//           </select>
//         </div>
//         <div><label style={labelStyle}>PLANT</label>
//           <select value={form.plant_id} onChange={e => setForm(f => ({ ...f, plant_id: e.target.value }))} style={inputStyle}>
//             <option value="">Any plant…</option>
//             {plants.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
//           </select>
//         </div>
//         <div><label style={labelStyle}>QTY ORDERED *</label><input type="number" value={form.qty_ordered} onChange={e => setForm(f => ({ ...f, qty_ordered: e.target.value }))} style={inputStyle} /></div>
//         <div><label style={labelStyle}>UOM</label>
//           <select value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} style={inputStyle}>
//             {['kg', 'L', 'unit', 'bag', 'drum', 'carton'].map(u => <option key={u}>{u}</option>)}
//           </select>
//         </div>
//         <div><label style={labelStyle}>ORDER DATE *</label><input type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} style={inputStyle} /></div>
//         <div><label style={labelStyle}>ETD *</label><input type="date" value={form.etd} onChange={e => setForm(f => ({ ...f, etd: e.target.value }))} style={inputStyle} /></div>
//         <div><label style={labelStyle}>NOTES</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" style={inputStyle} /></div>
//       </div>
//       {error && <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '12px' }}>{error}</div>}
//       <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
//         <button onClick={submit} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving…' : 'Create Order'}</button>
//         <button onClick={onCancel} style={{ padding: '9px 16px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
//       </div>
//     </div>
//   )
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────
// export default function SalesOrders() {
//   const { hasRole } = useAuth()
//   const [orders, setOrders] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [selected, setSelected] = useState(null)
//   const [showCreate, setShowCreate] = useState(false)
//   const [atRiskCount, setAtRiskCount] = useState(0)
//   const [filters, setFilters] = useState({ status: '', search: '' })
//   const [syncing, setSyncing] = useState(false)

//   const load = useCallback(() => {
//     setLoading(true)
//     const params = {}
//     if (filters.status) params.status = filters.status
//     if (filters.search) params.search = filters.search
//     salesApi.list(params).then(r => setOrders(r.data || [])).finally(() => setLoading(false))
//     salesApi.atRisk().then(r => setAtRiskCount((r.data || []).length)).catch(() => {})
//   }, [filters])

//   useEffect(() => { load() }, [load])

//   const syncExcel = async () => {
//     setSyncing(true)
//     try {
//       await salesApi.syncExcel()
//       load()
//       alert('MS365 Excel sync triggered. Orders updated.')
//     } catch (e) { alert(e.response?.data?.error || e.message) }
//     finally { setSyncing(false) }
//   }

//   const openOrder = async (di) => {
//     try {
//       const r = await salesApi.get(di)
//       setSelected(r.data)
//     } catch (e) { alert(e.message) }
//   }

//   return (
//     <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
//         <div>
//           <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Sales Orders</h1>
//           <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Order pipeline from creation to dispatch</p>
//         </div>
//         <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
//           {atRiskCount > 0 && (
//             <div style={{ padding: '8px 14px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#92400e' }}>
//               ⚠ {atRiskCount} order{atRiskCount > 1 ? 's' : ''} at risk
//             </div>
//           )}
//           {hasRole(['admin', 'sales_team']) && (
//             <button onClick={syncExcel} disabled={syncing} style={{ padding: '9px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
//               {syncing ? '⟳ Syncing…' : '⟳ Sync Excel'}
//             </button>
//           )}
//           {hasRole(['sales_team', 'admin']) && (
//             <button onClick={() => setShowCreate(s => !s)} style={btnPrimary(false)}>
//               {showCreate ? 'Cancel' : '+ New Order'}
//             </button>
//           )}
//         </div>
//       </div>

//       {showCreate && <CreateOrderForm onCreated={() => { setShowCreate(false); load() }} onCancel={() => setShowCreate(false)} />}

//       {/* Filters */}
//       <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
//         <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search by DI, customer, product…" style={{ ...inputStyle, width: '280px' }} />
//         <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, width: '180px' }}>
//           <option value="">All statuses</option>
//           {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
//         </select>
//       </div>

//       {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>Loading…</div> : (
//         <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
//           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
//             <thead>
//               <tr style={{ background: '#f8fafc' }}>
//                 {['DI Number', 'Customer', 'Product', 'Qty', 'Order Date', 'ETD', 'Status', ''].map(h => (
//                   <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {orders.length === 0 ? (
//                 <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>No orders found</td></tr>
//               ) : orders.map(o => (
//                 <tr key={o.di_number} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openOrder(o.di_number)}
//                   onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
//                   onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
//                   <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700 }}>{o.di_number}</td>
//                   <td style={{ padding: '12px 16px', fontWeight: 500 }}>{o.customer_name}</td>
//                   <td style={{ padding: '12px 16px' }}>{o.product_name}</td>
//                   <td style={{ padding: '12px 16px', fontWeight: 600 }}>{o.qty_ordered} {o.uom}</td>
//                   <td style={{ padding: '12px 16px' }}>{o.order_date ? new Date(o.order_date).toLocaleDateString('en-IN') : '—'}</td>
//                   <td style={{ padding: '12px 16px' }}>
//                     <span style={{ color: o.status === 'at_risk' ? '#dc2626' : '#1e293b', fontWeight: o.status === 'at_risk' ? 700 : 400 }}>
//                       {o.etd ? new Date(o.etd).toLocaleDateString('en-IN') : '—'}
//                     </span>
//                   </td>
//                   <td style={{ padding: '12px 16px' }}>{badge(o.status)}</td>
//                   <td style={{ padding: '12px 16px', color: '#94a3b8' }}>›</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {selected && (
//         <OrderDetail
//           order={selected}
//           onClose={() => setSelected(null)}
//           onRefresh={() => { openOrder(selected.di_number); load() }}
//         />
//       )}
//     </div>
//   )
// }
