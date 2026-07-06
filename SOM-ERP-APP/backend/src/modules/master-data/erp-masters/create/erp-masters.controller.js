import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'
import { normalizeUom, toCanonical, CANONICAL_UNITS } from '../../../../utils/uom.js'

// ── Items ─────────────────────────────────────────────────────────────────────

export const createItem = async (req, res) => {
  try {
    const { item_code, item_name, item_category, uom, warehouse_zone,
            reorder_level, decanting_tolerance_pct, is_microbial, supplier_default } = req.body || {}
    if (!item_code || !item_name || !item_category || !uom)
      return res.status(400).json({ success: false, error: 'item_code, item_name, item_category, uom required', code: 'VALIDATION_ERROR' })

    // Item master's unit is its physical stock unit — must be a real
    // KG/L/NOS quantity (not a special unit like CFU/g).
    const canonicalUom = normalizeUom(uom)
    if (!CANONICAL_UNITS.includes(canonicalUom))
      return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })

    const item = await prisma.erpItem.create({
      data: {
        itemCode: item_code,
        itemName: item_name,
        itemCategory: item_category,
        uom: canonicalUom,
        warehouseZone: warehouse_zone || null,
        reorderLevel: reorder_level || 0,
        decantingTolerancePct: decanting_tolerance_pct || 0.5,
        isMicrobial: is_microbial || false,
        supplierDefault: supplier_default || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_items', recordId: item_code, newValue: req.body })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Item code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const createSupplier = async (req, res) => {
  try {
    const { supplier_name, gstin, phone, email, address } = req.body || {}
    if (!supplier_name) return res.status(400).json({ success: false, error: 'supplier_name required', code: 'VALIDATION_ERROR' })

    const row = await prisma.erpSupplier.create({
      data: {
        supplierName: supplier_name,
        gstin: gstin || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_suppliers', recordId: row.supplierId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Plants ────────────────────────────────────────────────────────────────────

export const createPlant = async (req, res) => {
  try {
    const { plant_name, plant_code, location, plant_type } = req.body || {}
    if (!plant_name || !plant_code || !plant_type)
      return res.status(400).json({ success: false, error: 'plant_name, plant_code, plant_type required', code: 'VALIDATION_ERROR' })

    const row = await prisma.erpPlant.create({
      data: {
        plantName: plant_name,
        plantCode: plant_code,
        location: location || null,
        plantType: plant_type,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_plants', recordId: row.plantId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Plant code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Equipment (ERP) ───────────────────────────────────────────────────────────

export const createErpEquipment = async (req, res) => {
  try {
    const { plant_id, equipment_name, equipment_code, equipment_type,
            working_volume, working_volume_unit, cleaning_time_hrs, requires_sterilisation } = req.body || {}
    if (!equipment_name || !equipment_code || !equipment_type)
      return res.status(400).json({ success: false, error: 'equipment_name, equipment_code, equipment_type required', code: 'VALIDATION_ERROR' })

    let canonicalWorkingVolume = working_volume || null
    let canonicalWorkingVolumeUnit = working_volume_unit || 'KG'
    if (working_volume) {
      try {
        const c = toCanonical(working_volume, canonicalWorkingVolumeUnit)
        canonicalWorkingVolume = c.qty
        canonicalWorkingVolumeUnit = c.uom
      } catch (e) {
        return res.status(400).json({ success: false, error: `working_volume_unit: ${e.message}`, code: 'VALIDATION_ERROR' })
      }
    } else {
      canonicalWorkingVolumeUnit = normalizeUom(canonicalWorkingVolumeUnit) || 'KG'
    }

    const row = await prisma.erpEquipment.create({
      data: {
        plantId: plant_id || null,
        equipmentName: equipment_name,
        equipmentCode: equipment_code,
        equipmentType: equipment_type,
        workingVolume: canonicalWorkingVolume,
        workingVolumeUnit: canonicalWorkingVolumeUnit,
        cleaningTimeHrs: cleaning_time_hrs || 0,
        requiresSterilisation: requires_sterilisation || false,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_equipment', recordId: row.equipmentId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Equipment code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── ERP Products ──────────────────────────────────────────────────────────────

export const createErpProduct = async (req, res) => {
  try {
    const { product_code, product_name, product_category, plant_id, alternate_plant_id,
            alt_plant_requires_approval, formulation_type, shelf_life_days,
            consolidation_window_days, is_microbial, microbial_strain_id } = req.body || {}
    if (!product_code || !product_name)
      return res.status(400).json({ success: false, error: 'product_code and product_name required', code: 'VALIDATION_ERROR' })

    const row = await prisma.erpProduct.create({
      data: {
        productCode: product_code,
        productName: product_name,
        productCategory: product_category || null,
        plantId: plant_id || null,
        alternatePlantId: alternate_plant_id || null,
        altPlantRequiresApproval: alt_plant_requires_approval || false,
        formulationType: formulation_type || null,
        shelfLifeDays: shelf_life_days || null,
        consolidationWindowDays: consolidation_window_days || 3,
        isMicrobial: is_microbial || false,
        microbialStrainId: microbial_strain_id || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_products', recordId: product_code, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Product code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── BOM ───────────────────────────────────────────────────────────────────────

export const createBom = async (req, res) => {
  try {
    const { product_code, bom_version, effective_date, yield_pct, notes,
            formulation_lines = [], packing_lines = [] } = req.body || {}
    if (!product_code || !bom_version || !effective_date)
      return res.status(400).json({ success: false, error: 'product_code, bom_version, effective_date required', code: 'VALIDATION_ERROR' })

    const bom = await prisma.$transaction(async (tx) => {
      await tx.erpBomHeader.updateMany({
        where: { productCode: product_code, status: 'active' },
        data: { status: 'inactive' },
      })
      const newBom = await tx.erpBomHeader.create({
        data: {
          productCode: product_code,
          bomVersion: bom_version,
          effectiveDate: new Date(effective_date),
          approvedBy: req.user?.user_id || null,
          yieldPct: yield_pct || 98,
          notes: notes || null,
        },
      })
      // Formulation lines can carry potency units (CFU/g) that pass through
      // toCanonical() unchanged; packing lines are always a real KG/L/NOS
      // quantity, so any special unit there is a genuine input error.
      if (formulation_lines.length) {
        await tx.erpBomLineFormulation.createMany({
          data: formulation_lines.map(({ item_code, qty_per_unit, unit, is_critical }, i) => {
            const c = toCanonical(qty_per_unit, unit)
            return {
              bomId: newBom.bomId,
              itemCode: item_code,
              qtyPerUnit: c.qty,
              unit: c.uom,
              isCritical: is_critical || false,
              seqNo: i + 1,
            }
          }),
        })
      }
      if (packing_lines.length) {
        await tx.erpBomLinePacking.createMany({
          data: packing_lines.map(({ item_code, qty_per_unit, unit }, i) => {
            const c = toCanonical(qty_per_unit, unit)
            if (c.special) throw new Error(`Packing line for ${item_code}: "${unit}" is not a valid packing quantity unit`)
            return {
              bomId: newBom.bomId,
              itemCode: item_code,
              qtyPerUnit: c.qty,
              unit: c.uom,
              seqNo: i + 1,
            }
          }),
        })
      }
      return newBom
    })

    await createNotification({
      type: 'bom_version_changed',
      title: `BOM Updated: ${product_code} → ${bom_version}`,
      message: `BOM for Product ${product_code} updated to ${bom_version}. All pending plans using previous version require review.`,
      targetRole: 'planner',
      refType: 'bom_header',
      refId: bom.bomId,
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'bom_headers', recordId: bom.bomId, newValue: req.body })
    return res.status(201).json({ success: true, data: bom })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Strains ───────────────────────────────────────────────────────────────────

export const createStrain = async (req, res) => {
  try {
    const { strain_name, decay_k, optimal_temp_c, min_viable_cfu_per_ml, notes } = req.body || {}
    if (!strain_name || decay_k === undefined)
      return res.status(400).json({ success: false, error: 'strain_name and decay_k required', code: 'VALIDATION_ERROR' })

    const row = await prisma.microbialStrain.create({
      data: {
        strainName: strain_name,
        decayK: decay_k,
        optimalTempC: optimal_temp_c || null,
        minViableCfuPerMl: min_viable_cfu_per_ml || null,
        notes: notes || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'microbial_strains', recordId: row.strainId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────

export const createCustomer = async (req, res) => {
  try {
    const { customer_name, customer_code, gstin, address, state, phone, email } = req.body || {}
    if (!customer_name) return res.status(400).json({ success: false, error: 'customer_name required', code: 'VALIDATION_ERROR' })

    const row = await prisma.customer.create({
      data: {
        customerName: customer_name,
        customerCode: customer_code || null,
        gstin: gstin || null,
        address: address || null,
        state: state || null,
        phone: phone || null,
        email: email || null,
      },
    })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Customer code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Containers ────────────────────────────────────────────────────────────────

export const createErpContainer = async (req, res) => {
  try {
    const { container_id, container_qr, item_code, location, max_capacity, uom, low_stock_threshold } = req.body || {}
    if (!container_id || !item_code || !max_capacity)
      return res.status(400).json({ success: false, error: 'container_id, item_code, max_capacity required', code: 'VALIDATION_ERROR' })

    let canonicalMaxCapacity = max_capacity
    let canonicalUom = uom || null
    if (uom) {
      try {
        const c = toCanonical(max_capacity, uom)
        canonicalMaxCapacity = c.qty
        canonicalUom = c.uom
      } catch (e) {
        return res.status(400).json({ success: false, error: `uom: ${e.message}`, code: 'VALIDATION_ERROR' })
      }
    }

    const row = await prisma.erpContainer.create({
      data: {
        containerId: container_id,
        containerQr: container_qr || container_id,
        itemCode: item_code,
        location: location || null,
        maxCapacity: canonicalMaxCapacity,
        uom: canonicalUom,
        lowStockThreshold: low_stock_threshold || 0,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_containers', recordId: container_id, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Container ID already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
