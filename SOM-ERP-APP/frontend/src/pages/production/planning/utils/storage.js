// Legacy localStorage keys — kept for SFG stock (still local) and migration
export const SK = {
  tasks:    'erp_tasks',
  batchReg: 'erp_batch_registry',
  sfg:      'erp_sfg_stock',
}

export function lsLoad(k)   { try { return JSON.parse(localStorage.getItem(k)) || [] } catch { return [] } }
export function lsSave(k,d) { localStorage.setItem(k, JSON.stringify(d)) }
export function genId()     { return Date.now().toString(36) + Math.random().toString(36).slice(2,5) }

// ── SFG helpers (still local — no SFG backend yet) ───────────────────────────
export function sfgLoad()  { try { return JSON.parse(localStorage.getItem(SK.sfg)) || [] } catch { return [] } }
export function sfgSave(l) { localStorage.setItem(SK.sfg, JSON.stringify(l)) }

export function sfgAddEntry({ productName, batchCode, plant, qty, qtyUom, location, sourceTaskId }) {
  const list = sfgLoad()
  list.push({
    id: genId(),
    productName, batchCode, plant,
    qty:          parseFloat(qty) || 0,
    qtyRemaining: parseFloat(qty) || 0,
    qtyUom:       qtyUom || 'kg',
    location:     location || '',
    sourceTaskId: sourceTaskId || '',
    status:       'Available',
    createdAt:    new Date().toISOString(),
  })
  sfgSave(list)
}
