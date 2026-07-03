import prisma from '../../../../db.js'

// ── Items ─────────────────────────────────────────────────────────────────────

export const listItems = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getItem = async (req, res) => {
  try {
    const item = await prisma.erpItem.findUnique({
      where: { itemCode: req.params.code },
      include: { supplier: { select: { supplierName: true } } },
    })
    if (!item) return res.status(404).json({ success: false, error: 'Item not found', code: 'NOT_FOUND' })
    return res.json({
      success: true,
      data: { ...item, default_supplier_name: item.supplier?.supplierName ?? null, supplier: undefined },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const listSuppliers = async (req, res) => {
  try {
    const data = await prisma.erpSupplier.findMany({
      where: { isActive: true },
      orderBy: { supplierName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Plants ────────────────────────────────────────────────────────────────────

export const listPlants = async (req, res) => {
  try {
    const data = await prisma.erpPlant.findMany({
      where: { isActive: true },
      orderBy: { plantName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Equipment (ERP) ───────────────────────────────────────────────────────────

export const listErpEquipment = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── ERP Products ──────────────────────────────────────────────────────────────

export const listErpProducts = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── BOM ───────────────────────────────────────────────────────────────────────

export const listBom = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getBom = async (req, res) => {
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
    if (!bom) return res.status(404).json({ success: false, error: 'BOM not found', code: 'NOT_FOUND' })

    const formulation_lines = bom.formulation.map(f => ({ ...f, item_name: f.item?.itemName ?? null, item: undefined }))
    const packing_lines     = bom.packing.map(p => ({ ...p, item_name: p.item?.itemName ?? null, item: undefined }))
    return res.json({
      success: true,
      data: { ...bom, formulation: undefined, packing: undefined, formulation_lines, packing_lines },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Strains ───────────────────────────────────────────────────────────────────

export const listStrains = async (req, res) => {
  try {
    const data = await prisma.microbialStrain.findMany({
      where: { isActive: true },
      orderBy: { strainName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────

export const listCustomers = async (req, res) => {
  try {
    const data = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { customerName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Reason codes ──────────────────────────────────────────────────────────────

export const listReasonCodes = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Containers ────────────────────────────────────────────────────────────────

export const listErpContainers = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
