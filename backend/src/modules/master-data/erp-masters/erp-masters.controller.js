import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'
import { createNotification } from '../../../services/notification-service.js'

// ── Items ─────────────────────────────────────────────────────────────────────

export async function listItems(req, res) {
  try {
    const { category, search, active } = req.query
    const where = {}
    if (category) where.itemCategory = category
    if (search) where.OR = [
      { itemName: { contains: search, mode: 'insensitive' } },
      { itemCode: { contains: search, mode: 'insensitive' } },
    ]
    if (active !== undefined) where.isActive = active === 'true'

    const items = await prisma.erpItem.findMany({
      where,
      include: { supplier: { select: { supplierName: true } } },
      orderBy: { itemName: 'asc' },
    })
    const data = items.map(i => ({
      ...i,
      default_supplier_name: i.supplier?.supplierName ?? null,
      supplier: undefined,
    }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getItem(req, res) {
  try {
    const item = await prisma.erpItem.findUnique({
      where: { itemCode: req.params.code },
      include: { supplier: { select: { supplierName: true } } },
    })
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' })
    return res.json({
      success: true,
      data: { ...item, default_supplier_name: item.supplier?.supplierName ?? null, supplier: undefined },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createItem(req, res) {
  try {
    const { item_code, item_name, item_category, uom, warehouse_zone,
            reorder_level, decanting_tolerance_pct, is_microbial, supplier_default } = req.body || {}
    if (!item_code || !item_name || !item_category || !uom)
      return res.status(400).json({ success: false, error: 'item_code, item_name, item_category, uom required' })

    const item = await prisma.erpItem.create({
      data: {
        itemCode: item_code,
        itemName: item_name,
        itemCategory: item_category,
        uom,
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
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Item code already exists' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateItem(req, res) {
  try {
    const { item_name, item_category, uom, warehouse_zone, reorder_level,
            decanting_tolerance_pct, is_microbial, supplier_default, is_active } = req.body || {}
    const data = {}
    if (item_name !== undefined)               data.itemName              = item_name
    if (item_category !== undefined)           data.itemCategory          = item_category
    if (uom !== undefined)                     data.uom                   = uom
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
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Item not found' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function listSuppliers(req, res) {
  try {
    const data = await prisma.erpSupplier.findMany({
      where: { isActive: true },
      orderBy: { supplierName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createSupplier(req, res) {
  try {
    const { supplier_name, gstin, phone, email, address } = req.body || {}
    if (!supplier_name) return res.status(400).json({ success: false, error: 'supplier_name required' })

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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateSupplier(req, res) {
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
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Supplier not found' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── Plants ────────────────────────────────────────────────────────────────────

export async function listPlants(req, res) {
  try {
    const data = await prisma.erpPlant.findMany({
      where: { isActive: true },
      orderBy: { plantName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createPlant(req, res) {
  try {
    const { plant_name, plant_code, location, plant_type } = req.body || {}
    if (!plant_name || !plant_code || !plant_type)
      return res.status(400).json({ success: false, error: 'plant_name, plant_code, plant_type required' })

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
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Plant code already exists' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── Equipment (ERP) ───────────────────────────────────────────────────────────

export async function listErpEquipment(req, res) {
  try {
    const { plant_id } = req.query
    const where = {}
    if (plant_id) where.plantId = plant_id

    const rows = await prisma.erpEquipment.findMany({
      where,
      include: { plant: { select: { plantName: true } } },
      orderBy: { equipmentName: 'asc' },
    })
    const data = rows.map(e => ({ ...e, plant_name: e.plant?.plantName ?? null, plant: undefined }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createErpEquipment(req, res) {
  try {
    const { plant_id, equipment_name, equipment_code, equipment_type,
            working_volume, working_volume_unit, cleaning_time_hrs, requires_sterilisation } = req.body || {}
    if (!equipment_name || !equipment_code || !equipment_type)
      return res.status(400).json({ success: false, error: 'equipment_name, equipment_code, equipment_type required' })

    const row = await prisma.erpEquipment.create({
      data: {
        plantId: plant_id || null,
        equipmentName: equipment_name,
        equipmentCode: equipment_code,
        equipmentType: equipment_type,
        workingVolume: working_volume || null,
        workingVolumeUnit: working_volume_unit || 'KG',
        cleaningTimeHrs: cleaning_time_hrs || 0,
        requiresSterilisation: requires_sterilisation || false,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_equipment', recordId: row.equipmentId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Equipment code already exists' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function patchErpEquipment(req, res) {
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
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Equipment not found' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── ERP Products ──────────────────────────────────────────────────────────────

export async function listErpProducts(req, res) {
  try {
    const { status } = req.query
    const where = {}
    if (status) where.status = status

    const rows = await prisma.erpProduct.findMany({
      where,
      include: {
        plant:          { select: { plantName: true } },
        microbialStrain: { select: { strainName: true } },
      },
      orderBy: { productName: 'asc' },
    })
    const data = rows.map(p => ({
      ...p,
      plant_name:      p.plant?.plantName           ?? null,
      strain_name:     p.microbialStrain?.strainName ?? null,
      plant:           undefined,
      microbialStrain: undefined,
    }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createErpProduct(req, res) {
  try {
    const { product_code, product_name, product_category, plant_id, alternate_plant_id,
            alt_plant_requires_approval, formulation_type, shelf_life_days,
            consolidation_window_days, is_microbial, microbial_strain_id } = req.body || {}
    if (!product_code || !product_name)
      return res.status(400).json({ success: false, error: 'product_code and product_name required' })

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
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Product code already exists' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── BOM ───────────────────────────────────────────────────────────────────────

export async function listBom(req, res) {
  try {
    const { product_code, status } = req.query
    const where = {}
    if (product_code) where.productCode = product_code
    if (status)       where.status      = status

    const rows = await prisma.erpBomHeader.findMany({
      where,
      include: { approvedByUser: { select: { fullName: true } } },
      orderBy: [{ productCode: 'asc' }, { effectiveDate: 'desc' }],
    })
    const data = rows.map(b => ({
      ...b,
      approved_by_name: b.approvedByUser?.fullName ?? null,
      approvedByUser: undefined,
    }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getBom(req, res) {
  try {
    const bom = await prisma.erpBomHeader.findUnique({
      where: { bomId: req.params.id },
      include: {
        formulation: {
          include: { item: { select: { itemName: true } } },
          orderBy: { seqNo: 'asc' },
        },
        packing: {
          include: { item: { select: { itemName: true } } },
          orderBy: { seqNo: 'asc' },
        },
      },
    })
    if (!bom) return res.status(404).json({ success: false, error: 'BOM not found' })

    const formulation_lines = bom.formulation.map(f => ({ ...f, item_name: f.item?.itemName ?? null, item: undefined }))
    const packing_lines     = bom.packing.map(p => ({ ...p, item_name: p.item?.itemName ?? null, item: undefined }))
    return res.json({
      success: true,
      data: { ...bom, formulation: undefined, packing: undefined, formulation_lines, packing_lines },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createBom(req, res) {
  try {
    const { product_code, bom_version, effective_date, yield_pct, notes,
            formulation_lines = [], packing_lines = [] } = req.body || {}
    if (!product_code || !bom_version || !effective_date)
      return res.status(400).json({ success: false, error: 'product_code, bom_version, effective_date required' })

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
      if (formulation_lines.length) {
        await tx.erpBomLineFormulation.createMany({
          data: formulation_lines.map(({ item_code, qty_per_unit, unit, is_critical }, i) => ({
            bomId: newBom.bomId,
            itemCode: item_code,
            qtyPerUnit: qty_per_unit,
            unit,
            isCritical: is_critical || false,
            seqNo: i + 1,
          })),
        })
      }
      if (packing_lines.length) {
        await tx.erpBomLinePacking.createMany({
          data: packing_lines.map(({ item_code, qty_per_unit, unit }, i) => ({
            bomId: newBom.bomId,
            itemCode: item_code,
            qtyPerUnit: qty_per_unit,
            unit,
            seqNo: i + 1,
          })),
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── Strains ───────────────────────────────────────────────────────────────────

export async function listStrains(req, res) {
  try {
    const data = await prisma.microbialStrain.findMany({
      where: { isActive: true },
      orderBy: { strainName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createStrain(req, res) {
  try {
    const { strain_name, decay_k, optimal_temp_c, min_viable_cfu_per_ml, notes } = req.body || {}
    if (!strain_name || decay_k === undefined)
      return res.status(400).json({ success: false, error: 'strain_name and decay_k required' })

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
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function listCustomers(req, res) {
  try {
    const data = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { customerName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createCustomer(req, res) {
  try {
    const { customer_name, customer_code, gstin, address, state, phone, email } = req.body || {}
    if (!customer_name) return res.status(400).json({ success: false, error: 'customer_name required' })

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
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Customer code already exists' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── Reason codes ──────────────────────────────────────────────────────────────

export async function listReasonCodes(req, res) {
  try {
    const { category } = req.query
    const where = { isActive: true }
    if (category) where.category = category

    const data = await prisma.reasonCode.findMany({
      where,
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── Containers ────────────────────────────────────────────────────────────────

export async function listErpContainers(req, res) {
  try {
    const { item_code } = req.query
    const where = { isActive: true }
    if (item_code) where.itemCode = item_code

    const rows = await prisma.erpContainer.findMany({
      where,
      include: { item: { select: { itemName: true } } },
      orderBy: { containerId: 'asc' },
    })
    const data = rows.map(c => ({ ...c, item_name: c.item?.itemName ?? null, item: undefined }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createErpContainer(req, res) {
  try {
    const { container_id, container_qr, item_code, location, max_capacity, uom, low_stock_threshold } = req.body || {}
    if (!container_id || !item_code || !max_capacity)
      return res.status(400).json({ success: false, error: 'container_id, item_code, max_capacity required' })

    const row = await prisma.erpContainer.create({
      data: {
        containerId: container_id,
        containerQr: container_qr || container_id,
        itemCode: item_code,
        location: location || null,
        maxCapacity: max_capacity,
        uom: uom || null,
        lowStockThreshold: low_stock_threshold || 0,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_containers', recordId: container_id, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Container ID already exists' })
    return res.status(500).json({ success: false, error: err.message })
  }
}
