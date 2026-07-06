import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'

// ── Items ─────────────────────────────────────────────────────────────────────

export const updateItem = async (req, res) => {
  try {
    const { item_name, item_category, uom, warehouse_zone, reorder_level,
            decanting_tolerance_pct, is_microbial, supplier_default, is_active } = req.body || {}
    const data = {}
    if (item_name !== undefined)               data.itemName              = item_name
    if (item_category !== undefined)           data.itemCategory          = item_category
    if (uom !== undefined) {
      const canonicalUom = normalizeUom(uom)
      if (!CANONICAL_UNITS.includes(canonicalUom))
        return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })
      data.uom = canonicalUom
    }
    if (warehouse_zone !== undefined)          data.warehouseZone         = warehouse_zone
    if (reorder_level !== undefined)           data.reorderLevel          = reorder_level
    if (decanting_tolerance_pct !== undefined) data.decantingTolerancePct = decanting_tolerance_pct
    if (is_microbial !== undefined)            data.isMicrobial           = is_microbial
    if (supplier_default !== undefined)        data.supplierDefault       = supplier_default || null
    if (is_active !== undefined)               data.isActive              = is_active

    await prisma.erpItem.update({ where: { itemCode: req.params.code }, data })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'erp_items', recordId: req.params.code, newValue: req.body })
    return res.json({ success: true, message: 'Item updated' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Item not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const updateSupplier = async (req, res) => {
  try {
    const { supplier_name, gstin, phone, email, address, is_active } = req.body || {}
    const data = {}
    if (supplier_name !== undefined) data.supplierName = supplier_name
    if (gstin !== undefined)         data.gstin        = gstin
    if (phone !== undefined)         data.phone        = phone
    if (email !== undefined)         data.email        = email
    if (address !== undefined)       data.address      = address
    if (is_active !== undefined)     data.isActive     = is_active

    await prisma.erpSupplier.update({ where: { supplierId: req.params.id }, data })
    return res.json({ success: true, message: 'Supplier updated' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Supplier not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Equipment (ERP) ───────────────────────────────────────────────────────────

export const patchErpEquipment = async (req, res) => {
  try {
    const { status, equipment_name, working_volume, cleaning_time_hrs } = req.body || {}
    const data = {}
    if (status !== undefined)            data.status          = status
    if (equipment_name !== undefined)    data.equipmentName   = equipment_name
    if (working_volume !== undefined)    data.workingVolume   = working_volume
    if (cleaning_time_hrs !== undefined) data.cleaningTimeHrs = cleaning_time_hrs

    await prisma.erpEquipment.update({ where: { equipmentId: req.params.id }, data })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'erp_equipment', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Equipment updated' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Equipment not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
