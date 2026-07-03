// SOM ERP — Prisma Seed Script
// Run: npx prisma db seed   (from backend/ directory)
// Idempotent: safe to run multiple times

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ─── helpers ─────────────────────────────────────────────────────────────────
const d = (s) => new Date(s)
const log = (msg) => console.log(`  ✓ ${msg}`)

// ─── 1. Product Master ────────────────────────────────────────────────────────
async function seedProductMaster() {
  const products = [
    { productCode: 'RHZ-001',  productName: 'Rhizobium japonicum WP 500g',       plant: 'Nano' },
    { productCode: 'AZO-001',  productName: 'Azotobacter chroococcum WP 1kg',     plant: 'Nano' },
    { productCode: 'TRIC-001', productName: 'Trichoderma viride WP 1kg',          plant: 'Botanical' },
    { productCode: 'BAC-001',  productName: 'Bacillus subtilis KD-118 WP 1kg',    plant: 'Powder' },
    { productCode: 'PSB-001',  productName: 'Phosphate Solubilizer WP 500g',      plant: 'Powder' },
    { productCode: 'BCO-001',  productName: 'Bioconsortia WP 5kg Bulk',           plant: 'Granules' },
  ]
  for (const p of products) {
    await prisma.productMaster.upsert({
      where: { productCode: p.productCode },
      update: { productName: p.productName, plant: p.plant },
      create: p,
    })
  }
  log(`Product Master — ${products.length} products`)
}

// ─── 2. Equipment Master ──────────────────────────────────────────────────────
async function seedEquipmentMaster() {
  const equipment = [
    { equipName: 'Nano Reactor NR-200',      workingVolume: 200,  operation: 'Fermentation',  plant: 'Nano' },
    { equipName: 'Nano Reactor NR-500',      workingVolume: 500,  operation: 'Fermentation',  plant: 'Nano' },
    { equipName: 'Botanical Fermenter BF-100', workingVolume: 100, operation: 'Fermentation', plant: 'Botanical' },
    { equipName: 'Botanical Fermenter BF-200', workingVolume: 200, operation: 'Fermentation', plant: 'Botanical' },
    { equipName: 'Powder Blender PB-500',    workingVolume: 500,  operation: 'Blending',      plant: 'Powder' },
    { equipName: 'Granule Mixer GM-300',     workingVolume: 300,  operation: 'Mixing',        plant: 'Granules' },
    { equipName: 'Liquid Filling Line LF-1', workingVolume: null, operation: 'Filling',       plant: 'Liquid' },
  ]
  for (const e of equipment) {
    await prisma.equipmentMaster.upsert({
      where: { equipName: e.equipName },
      update: {},
      create: e,
    })
  }
  log(`Equipment Master — ${equipment.length} equipment`)
}

// ─── 3. Recipe DB ─────────────────────────────────────────────────────────────
async function seedRecipeDb() {
  const recipes = [
    // Rhizobium 500g
    { productCode: 'RHZ-001', productName: 'Rhizobium japonicum WP 500g',    rmCode: 'RHZ-BIO', rmName: 'Rhizobium Biomass Culture',  qtyPerUnit: 10,   uom: 'L',  roleType: 'INGREDIENT', isMicrobe: true,  requiredCfu: 1e9 },
    { productCode: 'RHZ-001', productName: 'Rhizobium japonicum WP 500g',    rmCode: 'SIL-001', rmName: 'Silica Powder',              qtyPerUnit: 0.5,  uom: 'kg', roleType: 'CARRIER',    isMicrobe: false },
    { productCode: 'RHZ-001', productName: 'Rhizobium japonicum WP 500g',    rmCode: 'CAC-001', rmName: 'Calcium Carbonate',          qtyPerUnit: 0.3,  uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    { productCode: 'RHZ-001', productName: 'Rhizobium japonicum WP 500g',    rmCode: 'SMP-001', rmName: 'Skim Milk Powder',           qtyPerUnit: 0.1,  uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    // Azotobacter 1kg
    { productCode: 'AZO-001', productName: 'Azotobacter chroococcum WP 1kg', rmCode: 'AZO-BIO', rmName: 'Azotobacter Culture',       qtyPerUnit: 8,    uom: 'L',  roleType: 'INGREDIENT', isMicrobe: true,  requiredCfu: 8e8 },
    { productCode: 'AZO-001', productName: 'Azotobacter chroococcum WP 1kg', rmCode: 'SIL-001', rmName: 'Silica Powder',              qtyPerUnit: 0.4,  uom: 'kg', roleType: 'CARRIER',    isMicrobe: false },
    { productCode: 'AZO-001', productName: 'Azotobacter chroococcum WP 1kg', rmCode: 'CAC-001', rmName: 'Calcium Carbonate',          qtyPerUnit: 0.35, uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    { productCode: 'AZO-001', productName: 'Azotobacter chroococcum WP 1kg', rmCode: 'SMP-001', rmName: 'Skim Milk Powder',           qtyPerUnit: 0.1,  uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    // Trichoderma 1kg
    { productCode: 'TRIC-001', productName: 'Trichoderma viride WP 1kg',     rmCode: 'TRI-BIO', rmName: 'Trichoderma viride Culture', qtyPerUnit: 5,    uom: 'L',  roleType: 'INGREDIENT', isMicrobe: true,  requiredCfu: 5e7 },
    { productCode: 'TRIC-001', productName: 'Trichoderma viride WP 1kg',     rmCode: 'SIL-001', rmName: 'Silica Powder',              qtyPerUnit: 0.4,  uom: 'kg', roleType: 'CARRIER',    isMicrobe: false },
    { productCode: 'TRIC-001', productName: 'Trichoderma viride WP 1kg',     rmCode: 'CAC-001', rmName: 'Calcium Carbonate',          qtyPerUnit: 0.4,  uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    { productCode: 'TRIC-001', productName: 'Trichoderma viride WP 1kg',     rmCode: 'TALC-001',rmName: 'Talc',                      qtyPerUnit: 0.1,  uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    // Bacillus subtilis 1kg
    { productCode: 'BAC-001', productName: 'Bacillus subtilis KD-118 WP 1kg', rmCode: 'BAC-BIO',rmName: 'Bacillus subtilis Biomass', qtyPerUnit: 8,    uom: 'L',  roleType: 'INGREDIENT', isMicrobe: true,  requiredCfu: 2e9 },
    { productCode: 'BAC-001', productName: 'Bacillus subtilis KD-118 WP 1kg', rmCode: 'SIL-001',rmName: 'Silica Powder',             qtyPerUnit: 0.45, uom: 'kg', roleType: 'CARRIER',    isMicrobe: false },
    { productCode: 'BAC-001', productName: 'Bacillus subtilis KD-118 WP 1kg', rmCode: 'CAC-001',rmName: 'Calcium Carbonate',         qtyPerUnit: 0.3,  uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    { productCode: 'BAC-001', productName: 'Bacillus subtilis KD-118 WP 1kg', rmCode: 'MGS-001',rmName: 'Magnesium Stearate',       qtyPerUnit: 0.05, uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    { productCode: 'BAC-001', productName: 'Bacillus subtilis KD-118 WP 1kg', rmCode: 'SMP-001',rmName: 'Skim Milk Powder',          qtyPerUnit: 0.1,  uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
    // Bioconsortia 5kg
    { productCode: 'BCO-001', productName: 'Bioconsortia WP 5kg Bulk',       rmCode: 'RHZ-BIO', rmName: 'Rhizobium Biomass Culture', qtyPerUnit: 3,    uom: 'L',  roleType: 'INGREDIENT', isMicrobe: true,  requiredCfu: 1e9 },
    { productCode: 'BCO-001', productName: 'Bioconsortia WP 5kg Bulk',       rmCode: 'AZO-BIO', rmName: 'Azotobacter Culture',       qtyPerUnit: 2,    uom: 'L',  roleType: 'INGREDIENT', isMicrobe: true,  requiredCfu: 8e8 },
    { productCode: 'BCO-001', productName: 'Bioconsortia WP 5kg Bulk',       rmCode: 'TRI-BIO', rmName: 'Trichoderma viride Culture',qtyPerUnit: 1.5,  uom: 'L',  roleType: 'INGREDIENT', isMicrobe: true,  requiredCfu: 5e7 },
    { productCode: 'BCO-001', productName: 'Bioconsortia WP 5kg Bulk',       rmCode: 'SIL-001', rmName: 'Silica Powder',             qtyPerUnit: 0.8,  uom: 'kg', roleType: 'CARRIER',    isMicrobe: false },
    { productCode: 'BCO-001', productName: 'Bioconsortia WP 5kg Bulk',       rmCode: 'CAC-001', rmName: 'Calcium Carbonate',         qtyPerUnit: 0.5,  uom: 'kg', roleType: 'INGREDIENT', isMicrobe: false },
  ]
  for (const r of recipes) {
    await prisma.recipeDb.upsert({
      where: { productCode_rmCode: { productCode: r.productCode, rmCode: r.rmCode } },
      update: { qtyPerUnit: r.qtyPerUnit, uom: r.uom },
      create: r,
    })
  }
  log(`Recipe DB — ${recipes.length} BOM lines across 5 products`)
}

// ─── 4. Sequence tables ───────────────────────────────────────────────────────
async function seedSequences() {
  await prisma.soSequence.upsert({ where: { year: 2026 }, update: {}, create: { year: 2026, seq: 5 } })
  await prisma.planSequence.upsert({ where: { year: 2026 }, update: {}, create: { year: 2026, seq: 5 } })
  log('Sequences — so_sequence & plan_sequence bootstrapped at 5')
}

// ─── 5. Customer Profiles ─────────────────────────────────────────────────────
async function seedCustomerProfiles() {
  const profiles = [
    { customerName: 'Krishidhan Seeds Ltd',       company: 'SOM', orderType: 'DOMESTIC', orderCount: 3 },
    { customerName: 'Bharat Agro Inputs',          company: 'SOM', orderType: 'DOMESTIC', orderCount: 2 },
    { customerName: 'Southern Agri Traders',       company: 'SOM', orderType: 'DOMESTIC', orderCount: 2 },
    { customerName: 'North India Fertilizers',     company: 'SOM', orderType: 'DOMESTIC', orderCount: 1 },
    { customerName: 'AgroTech International Ltd',  company: 'SOM', orderType: 'EXPORT',   orderCount: 2 },
  ]
  for (const p of profiles) {
    await prisma.customerProfile.upsert({
      where: { customerName: p.customerName },
      update: { orderCount: p.orderCount },
      create: p,
    })
  }

  // Customer × Product memory
  const cppRecords = [
    {
      customerName: 'Krishidhan Seeds Ltd', productName: 'Rhizobium 500g',
      productCode: 'RHZ-001', inhouseName: 'Rhizobium japonicum WP 500g',
      activeSpecs: '1x10⁹ CFU/gm', carrier: 'Silica', sectionName: 'NANO',
      unitQty: 0.5, unitUom: 'KG', unitPackType: 'HDPE Pouch',
      primaryPack: 'LD Pouch', secondaryPack: 'Carton Box', unitsPerCS: 20, totalUom: 'KG',
      labelType: 'CUSTOMER', mrp: 120, shelfLifeDays: 365, orderCount: 3,
    },
    {
      customerName: 'Bharat Agro Inputs', productName: 'Azotobacter 1kg',
      productCode: 'AZO-001', inhouseName: 'Azotobacter chroococcum WP 1kg',
      activeSpecs: '1x10⁹ CFU/gm', carrier: 'Silica', sectionName: 'NANO',
      unitQty: 1, unitUom: 'KG', unitPackType: 'HDPE Bag',
      primaryPack: 'HDPE Bag 1kg', secondaryPack: 'Carton Box', unitsPerCS: 10, totalUom: 'KG',
      labelType: 'CUSTOMER', mrp: 200, shelfLifeDays: 365, orderCount: 2,
    },
    {
      customerName: 'Southern Agri Traders', productName: 'Trichoderma 1kg',
      productCode: 'TRIC-001', inhouseName: 'Trichoderma viride WP 1kg',
      activeSpecs: '1x10⁸ CFU/gm', carrier: 'Silica', sectionName: 'BOTANICAL',
      unitQty: 1, unitUom: 'KG', unitPackType: 'HDPE Bag',
      primaryPack: 'HDPE Bag 1kg', secondaryPack: 'Carton Box', unitsPerCS: 10, totalUom: 'KG',
      labelType: 'CUSTOMER', mrp: 180, shelfLifeDays: 270, orderCount: 2,
    },
    {
      customerName: 'North India Fertilizers', productName: 'Bacillus subtilis 1kg',
      productCode: 'BAC-001', inhouseName: 'Bacillus subtilis KD-118 WP 1kg',
      activeSpecs: '2x10⁹ CFU/gm', carrier: 'Silica+Talc', sectionName: 'POWDER',
      unitQty: 1, unitUom: 'KG', unitPackType: 'HDPE Bag',
      primaryPack: 'AL Foil Bag 1kg', secondaryPack: 'OMB30', unitsPerCS: 30, totalUom: 'KG',
      labelType: 'PACKING_SLIP', mrp: 250, shelfLifeDays: 365, orderCount: 1,
    },
    {
      customerName: 'AgroTech International Ltd', productName: 'Bioconsortia 5kg',
      productCode: 'BCO-001', inhouseName: 'Bioconsortia WP 5kg Bulk',
      activeSpecs: 'Multi-strain 1x10⁹ CFU/gm each', carrier: 'Silica', sectionName: 'GRANULES',
      unitQty: 5, unitUom: 'KG', unitPackType: 'HDPE Drum',
      primaryPack: 'HDPE Drum 5kg', secondaryPack: 'Stretch-wrapped pallet', unitsPerCS: 4, totalUom: 'KG',
      labelType: 'COMPUTER_LABELS', mrp: 900, shelfLifeDays: 365, orderCount: 2,
    },
  ]
  for (const c of cppRecords) {
    await prisma.customerProductProfile.upsert({
      where: { customerName_productName: { customerName: c.customerName, productName: c.productName } },
      update: { orderCount: c.orderCount },
      create: c,
    })
  }
  log(`Customer Profiles — ${profiles.length} profiles, ${cppRecords.length} product memories`)
}

// ─── 6. Sales Orders + Items ──────────────────────────────────────────────────
async function seedSalesOrders() {
  const orders = [
    {
      soId: 'SO-2026-0001', company: 'SOM', diNo: 'DI-2026-0001',
      customerName: 'Krishidhan Seeds Ltd', orderType: 'DOMESTIC',
      orderReceivedDate: d('2026-06-01'), priority: 'URGENT',
      estimatedDispatchDate: d('2026-06-20'),
      invoiceNo: 'INV-2026-0101', invoiceDate: d('2026-06-18'),
      transportName: 'Shree Ram Transport', salesStaff: 'Rajesh Patil',
      dispatchedBy: 'Mohan Kumar',
      remarks: 'Kharif season rush order',
      items: [
        {
          lineNo: 1, customerProductName: 'Rhizobium 500g',
          inhouseProductName: 'Rhizobium japonicum WP 500g', inhouseProductCode: 'RHZ-001',
          activeSpecs: '1x10⁹ CFU/gm', activeIngredient: 'Rhizobium japonicum',
          carrier: 'Silica', sectionName: 'NANO',
          totalQty: 1000, totalUom: 'KG',
          unitQty: 0.5, unitUom: 'KG', unitPackType: 'HDPE Pouch',
          packingType: 'Carton Box', totalCS: 100,
          labelType: 'CUSTOMER', mrp: 120,
          mfgDate: d('2026-06-05'), expDate: d('2027-06-05'),
          status: 'DISPATCHED',
        },
      ],
    },
    {
      soId: 'SO-2026-0002', company: 'SOM', diNo: 'DI-2026-0002',
      customerName: 'Bharat Agro Inputs', orderType: 'DOMESTIC',
      orderReceivedDate: d('2026-06-05'), priority: 'MODERATE',
      estimatedDispatchDate: d('2026-06-28'),
      salesStaff: 'Suman Verma',
      remarks: 'Recurring quarterly order',
      items: [
        {
          lineNo: 1, customerProductName: 'Azotobacter 1kg',
          inhouseProductName: 'Azotobacter chroococcum WP 1kg', inhouseProductCode: 'AZO-001',
          activeSpecs: '1x10⁹ CFU/gm', activeIngredient: 'Azotobacter chroococcum',
          carrier: 'Silica', sectionName: 'NANO',
          totalQty: 500, totalUom: 'KG',
          unitQty: 1, unitUom: 'KG', unitPackType: 'HDPE Bag',
          packingType: 'Carton Box', totalCS: 50,
          labelType: 'CUSTOMER', mrp: 200,
          mfgDate: d('2026-06-15'), expDate: d('2027-06-15'),
          status: 'UNDER_PRODUCTION',
        },
      ],
    },
    {
      soId: 'SO-2026-0003', company: 'SOM', diNo: 'DI-2026-0003',
      customerName: 'Southern Agri Traders', orderType: 'DOMESTIC',
      orderReceivedDate: d('2026-06-08'), priority: 'MODERATE',
      estimatedDispatchDate: d('2026-06-30'),
      salesStaff: 'Priya Nair',
      remarks: 'Biocontrol for mango orchards',
      items: [
        {
          lineNo: 1, customerProductName: 'Trichoderma 1kg',
          inhouseProductName: 'Trichoderma viride WP 1kg', inhouseProductCode: 'TRIC-001',
          activeSpecs: '1x10⁸ CFU/gm', activeIngredient: 'Trichoderma viride',
          carrier: 'Silica', sectionName: 'BOTANICAL',
          totalQty: 300, totalUom: 'KG',
          unitQty: 1, unitUom: 'KG', unitPackType: 'HDPE Bag',
          packingType: 'Carton Box', totalCS: 30,
          labelType: 'CUSTOMER', mrp: 180,
          mfgDate: d('2026-06-20'), expDate: d('2027-03-20'),
          status: 'PLANNED',
        },
      ],
    },
    {
      soId: 'SO-2026-0004', company: 'SOM', diNo: 'DI-2026-0004',
      customerName: 'North India Fertilizers', orderType: 'DOMESTIC',
      orderReceivedDate: d('2026-06-10'), priority: 'MODERATE',
      estimatedDispatchDate: d('2026-07-05'),
      salesStaff: 'Amit Sharma',
      remarks: 'Powder section — dual product order',
      items: [
        {
          lineNo: 1, customerProductName: 'Bacillus subtilis 1kg',
          inhouseProductName: 'Bacillus subtilis KD-118 WP 1kg', inhouseProductCode: 'BAC-001',
          activeSpecs: '2x10⁹ CFU/gm', activeIngredient: 'Bacillus subtilis KD-118',
          carrier: 'Silica+Talc', sectionName: 'POWDER',
          totalQty: 500, totalUom: 'KG',
          unitQty: 1, unitUom: 'KG', unitPackType: 'HDPE Bag',
          packingType: 'OMB30', totalCS: 17,
          labelType: 'PACKING_SLIP', mrp: 250,
          status: 'PENDING',
        },
        {
          lineNo: 2, customerProductName: 'Phosphate Solubilizer 500g',
          inhouseProductName: 'Phosphate Solubilizer WP 500g', inhouseProductCode: 'PSB-001',
          activeSpecs: '1x10⁸ CFU/gm', activeIngredient: 'Bacillus megaterium',
          carrier: 'Silica', sectionName: 'POWDER',
          totalQty: 250, totalUom: 'KG',
          unitQty: 0.5, unitUom: 'KG', unitPackType: 'HDPE Pouch',
          packingType: 'Carton Box', totalCS: 25,
          labelType: 'PACKING_SLIP', mrp: 110,
          status: 'PENDING',
        },
      ],
    },
    {
      soId: 'SO-2026-0005', company: 'SOM', diNo: 'DI-2026-0005',
      customerName: 'AgroTech International Ltd', orderType: 'EXPORT',
      orderReceivedDate: d('2026-06-12'), priority: 'VERY_URGENT',
      estimatedDispatchDate: d('2026-07-15'),
      salesStaff: 'Vikram Rao',
      remarks: 'Export to Malaysia — phyto certificate required',
      items: [
        {
          lineNo: 1, customerProductName: 'Bioconsortia 5kg',
          inhouseProductName: 'Bioconsortia WP 5kg Bulk', inhouseProductCode: 'BCO-001',
          activeSpecs: 'Multi-strain 1x10⁹ CFU/gm each', carrier: 'Silica',
          activeIngredient: 'Rhizobium + Azotobacter + Trichoderma', sectionName: 'GRANULES',
          totalQty: 1000, totalUom: 'KG',
          unitQty: 5, unitUom: 'KG', unitPackType: 'HDPE Drum',
          packingType: 'Stretch-wrapped pallet', totalCS: 50,
          labelType: 'COMPUTER_LABELS', mrp: 900,
          status: 'PENDING',
        },
      ],
    },
  ]

  for (const { items, ...soData } of orders) {
    await prisma.salesOrder.upsert({
      where: { soId: soData.soId },
      update: {},
      create: { ...soData, items: { create: items } },
    })
  }
  log(`Sales Orders — 5 orders (SO-2026-0001 to 0005), 7 line items`)
}

// ─── 7. Production Plans ──────────────────────────────────────────────────────
async function seedProductionPlans() {
  const plans = [
    {
      planId: 'PP-2026-0001', diNo: 'DI-2026-0001',
      customerName: 'Krishidhan Seeds Ltd', sectionType: 'NANO',
      plannedDate: d('2026-06-04'), shift: 'G',
      batchIncharge: 'Suresh Kadam', noOfCycles: 2, cycleBatchSize: 500,
      equipment: 'Nano Reactor NR-500', location: 'Block A – Nano Plant',
      productCode: 'RHZ-001', productName: 'Rhizobium japonicum WP 500g',
      batchCode: 'RHZ-260605-01', totalQty: 1000, uom: 'KG',
      carrier: 'Silica', specs: '1x10⁹ CFU/gm', process: 'Formulation',
      unitPackQty: 0.5, noOfUnits: 2000, pp1: 'LD Pouch', pp2: null,
      sp1: 'Carton Box', noOfSp: 100, labels: 'CUSTOMER',
      femaleWorkers: 6, maleWorkers: 2,
      status: 'COMPLETED',
      rmCheckStatus: 'GREEN', eqpCheckStatus: 'AVAILABLE',
      rmCheckDetails: [
        { rmCode: 'RHZ-BIO', required: 10000, available: 12000, status: 'OK' },
        { rmCode: 'SIL-001', required: 500,   available: 800,   status: 'OK' },
        { rmCode: 'CAC-001', required: 300,   available: 1200,  status: 'OK' },
        { rmCode: 'SMP-001', required: 100,   available: 300,   status: 'OK' },
      ],
    },
    {
      planId: 'PP-2026-0002', diNo: 'DI-2026-0002',
      customerName: 'Bharat Agro Inputs', sectionType: 'NANO',
      plannedDate: d('2026-06-15'), shift: 'G',
      batchIncharge: 'Suresh Kadam', noOfCycles: 1, cycleBatchSize: 500,
      equipment: 'Nano Reactor NR-500', location: 'Block A – Nano Plant',
      productCode: 'AZO-001', productName: 'Azotobacter chroococcum WP 1kg',
      batchCode: 'AZO-260615-01', totalQty: 500, uom: 'KG',
      carrier: 'Silica', specs: '1x10⁹ CFU/gm', process: 'Formulation',
      unitPackQty: 1, noOfUnits: 500, pp1: 'HDPE Bag 1kg',
      sp1: 'Carton Box', noOfSp: 50, labels: 'CUSTOMER',
      femaleWorkers: 4, maleWorkers: 2,
      status: 'IN_PROGRESS',
      rmCheckStatus: 'GREEN', eqpCheckStatus: 'AVAILABLE',
    },
    {
      planId: 'PP-2026-0003', diNo: 'DI-2026-0003',
      customerName: 'Southern Agri Traders', sectionType: 'BOTANICAL',
      plannedDate: d('2026-06-20'), shift: 'G',
      batchIncharge: 'Pradeep Gholap', noOfCycles: 1, cycleBatchSize: 300,
      equipment: 'Botanical Fermenter BF-200', location: 'Block B – Botanical Plant',
      productCode: 'TRIC-001', productName: 'Trichoderma viride WP 1kg',
      batchCode: 'TRIC-260620-01', totalQty: 300, uom: 'KG',
      carrier: 'Silica', specs: '1x10⁸ CFU/gm', process: 'Fermentation',
      stageInfo: '7-day incubation at 25°C',
      unitPackQty: 1, noOfUnits: 300, pp1: 'HDPE Bag 1kg',
      sp1: 'Carton Box', noOfSp: 30, labels: 'CUSTOMER',
      femaleWorkers: 3, maleWorkers: 1,
      status: 'REVIEWED',
      rmCheckStatus: 'AMBER', eqpCheckStatus: 'AVAILABLE',
      rmCheckDetails: [
        { rmCode: 'TRI-BIO', required: 1500, available: 1200, status: 'SHORT' },
        { rmCode: 'SIL-001', required: 120,  available: 800,  status: 'OK'    },
      ],
      remarks: 'Trichoderma culture slightly short — procurement to arrange 300L more',
    },
    {
      planId: 'PP-2026-0004', diNo: 'DI-2026-0004',
      customerName: 'North India Fertilizers', sectionType: 'POWDER',
      plannedDate: d('2026-06-28'), shift: 'A',
      batchIncharge: 'Ravi Mishra', noOfCycles: 1, cycleBatchSize: 500,
      equipment: 'Powder Blender PB-500', location: 'Block C – Powder Plant',
      productCode: 'BAC-001', productName: 'Bacillus subtilis KD-118 WP 1kg',
      batchCode: 'BAC-260628-01', totalQty: 500, uom: 'KG',
      carrier: 'Silica+Talc', specs: '2x10⁹ CFU/gm', process: 'Blending',
      unitPackQty: 1, noOfUnits: 500, pp1: 'AL Foil Bag 1kg',
      sp1: 'OMB30', noOfSp: 17, labels: 'PACKING_SLIP',
      femaleWorkers: 8, maleWorkers: 3,
      status: 'DRAFT',
      rmCheckStatus: 'GREEN', eqpCheckStatus: 'AVAILABLE',
    },
    {
      planId: 'PP-2026-0005', diNo: 'DI-2026-0005',
      customerName: 'AgroTech International Ltd', sectionType: 'GRANULES',
      plannedDate: d('2026-07-02'), shift: 'G',
      batchIncharge: 'Naresh Pawar', noOfCycles: 4, cycleBatchSize: 250,
      equipment: 'Granule Mixer GM-300', location: 'Block D – Granules Plant',
      productCode: 'BCO-001', productName: 'Bioconsortia WP 5kg Bulk',
      batchCode: 'BCO-260702-01', totalQty: 1000, uom: 'KG',
      carrier: 'Silica', specs: 'Multi-strain 1x10⁹ CFU/gm each', process: 'Blending',
      unitPackQty: 5, noOfUnits: 200, pp1: 'HDPE Drum 5kg',
      sp1: 'Stretch-wrapped pallet', noOfSp: 50, labels: 'COMPUTER_LABELS',
      femaleWorkers: 5, maleWorkers: 5,
      status: 'DRAFT',
      rmCheckStatus: 'AMBER', eqpCheckStatus: 'AVAILABLE',
      remarks: 'Multi-strain — coordinate with cold room for culture availability',
    },
  ]

  for (const p of plans) {
    await prisma.productionPlan.upsert({
      where: { planId: p.planId },
      update: { status: p.status },
      create: p,
    })
  }
  log(`Production Plans — 5 plans (PP-2026-0001 to 0005) across NANO / BOTANICAL / POWDER / GRANULES`)
}

// ─── 8. BOM Send Requests ─────────────────────────────────────────────────────
async function seedBomSends() {
  const sends = [
    {
      sendId: 'BOM-0605-001', planId: 'PP-2026-0001',
      productCode: 'RHZ-001', productName: 'Rhizobium japonicum WP 500g',
      batchNo: 'RHZ-260605-01', diNo: 'DI-2026-0001', sectionType: 'NANO',
      bomType: 'FORMULATION', totalQty: 1000, uom: 'KG',
      status: 'ISSUED', sentBy: 'Suresh Kadam',
      sentAt: d('2026-06-03T09:00:00Z'), pickedAt: d('2026-06-03T10:30:00Z'), issuedAt: d('2026-06-04T08:00:00Z'),
    },
    {
      sendId: 'BOM-0605-002', planId: 'PP-2026-0001',
      productCode: 'RHZ-001', productName: 'Rhizobium japonicum WP 500g',
      batchNo: 'RHZ-260605-01', diNo: 'DI-2026-0001', sectionType: 'NANO',
      bomType: 'PACKING', totalQty: 1000, uom: 'KG',
      status: 'ISSUED', sentBy: 'Suresh Kadam',
      sentAt: d('2026-06-06T09:00:00Z'), pickedAt: d('2026-06-06T11:00:00Z'), issuedAt: d('2026-06-07T08:00:00Z'),
    },
    {
      sendId: 'BOM-0615-001', planId: 'PP-2026-0002',
      productCode: 'AZO-001', productName: 'Azotobacter chroococcum WP 1kg',
      batchNo: 'AZO-260615-01', diNo: 'DI-2026-0002', sectionType: 'NANO',
      bomType: 'FORMULATION', totalQty: 500, uom: 'KG',
      status: 'PICKED', sentBy: 'Suresh Kadam',
      sentAt: d('2026-06-14T09:00:00Z'), pickedAt: d('2026-06-14T11:30:00Z'),
    },
  ]
  for (const s of sends) {
    await prisma.bomSend.upsert({
      where: { sendId: s.sendId },
      update: { status: s.status },
      create: s,
    })
  }
  log(`BOM Sends — ${sends.length} records (2 ISSUED for DI-0001, 1 PICKED for DI-0002)`)
}

// ─── 9. Planner Logs ──────────────────────────────────────────────────────────
async function seedPlannerLogs() {
  const count = await prisma.plannerLog.count()
  if (count === 0) {
    await prisma.plannerLog.createMany({
      data: [
        { runAt: d('2026-06-02T08:00:00Z'), trigger: 'MANUAL',    plansCreated: 2, ordersProcessed: 2 },
        { runAt: d('2026-06-09T08:00:00Z'), trigger: 'SCHEDULED', plansCreated: 3, ordersProcessed: 3 },
      ],
    })
    log('Planner Logs — 2 planner run records')
  } else {
    log(`Planner Logs — skipped (${count} existing records)`)
  }
}

// ─── 10. Production Data (Indent → Batch → Stage Logs) ───────────────────────
async function seedProductionData() {
  // ── Indent for DI-2026-0001 (COMPLETED) ──────────────────────────────────
  let indent1 = await prisma.indentMaster.findFirst({ where: { batchNo: 'RHZ-260605-01', diNo: 'DI-2026-0001' } })
  if (!indent1) {
    indent1 = await prisma.indentMaster.create({
      data: {
        productCode: 'RHZ-001', productName: 'Rhizobium japonicum WP 500g',
        batchSize: 1000, batchNo: 'RHZ-260605-01', diNo: 'DI-2026-0001',
        plant: 'Nano', equipment: 'Nano Reactor NR-500',
        cycleBatchSize: 500, cycleNo: 1, totalCycles: 2,
        status: 'CLOSED',
        details: {
          create: [
            { rmCode: 'RHZ-BIO', rmName: 'Rhizobium Biomass Culture', requiredQty: 10000, issuedQty: 10000, balanceQty: 0 },
            { rmCode: 'SIL-001', rmName: 'Silica Powder',             requiredQty: 500,   issuedQty: 500,   balanceQty: 0 },
            { rmCode: 'CAC-001', rmName: 'Calcium Carbonate',         requiredQty: 300,   issuedQty: 300,   balanceQty: 0 },
            { rmCode: 'SMP-001', rmName: 'Skim Milk Powder',          requiredQty: 100,   issuedQty: 100,   balanceQty: 0 },
          ],
        },
      },
    })
    log(`Indent — IND-001 created (RHZ, CLOSED)`)
  }

  // ── Production Batch for Indent 1 (COMPLETED with all stage logs) ─────────
  let batch1 = await prisma.productionBatch.findFirst({ where: { batchCode: 'RHZ-260605-01' } })
  if (!batch1) {
    batch1 = await prisma.productionBatch.create({
      data: {
        indentId: indent1.indentId, productCode: 'RHZ-001',
        productName: 'Rhizobium japonicum WP 500g',
        diNo: 'DI-2026-0001', batchCode: 'RHZ-260605-01',
        orderQty: 1000, category: 'LIQUID', currentStage: 'HANDOVER', status: 'COMPLETED',
        temperature: 28.5, humidity: 62, cfuTarget: '1x10⁹ CFU/gm',
        biomassFlag: true, technicalFlag: true, formulationFlag: true,
        sievingFlag: true, packingFlag: true, qcFlag: true,
        biomassInputs: {
          create: [
            {
              cultureName: 'Rhizobium japonicum', batchNo: 'MC-RHZ-2604-01',
              doi: '2026-04-15', cfuPerGram: 1.2e9, biomassQty: 10000,
              moisture: 72.5, form: 'Liquid Culture', receivedFrom: 'Cold Room 1',
              receivedDate: '2026-06-04', receivedTime: '08:30',
            },
          ],
        },
        technicalDetail: {
          create: {
            method: 'MANUAL', startTime: '09:00', endTime: '13:30',
            biomassQty: 10000, silicaQty: 500, caco3Qty: 300,
            mgStearateQty: 0, smpQty: 100,
            totalTechnicalQty: 990, qtyAfterSieving: 982, wastage: 8,
          },
        },
        formulationCycles: {
          create: [
            {
              cycleNo: 1, formulationDate: '2026-06-05',
              startTime: '09:00', endTime: '14:00',
              noOfWorkers: 8, sfgUsed: false, carrierType: 'Silica',
              inchargeName: 'Suresh Kadam',
            },
            {
              cycleNo: 2, formulationDate: '2026-06-06',
              startTime: '09:00', endTime: '14:00',
              noOfWorkers: 8, sfgUsed: false, carrierType: 'Silica',
              inchargeName: 'Suresh Kadam',
            },
          ],
        },
        unloadingLog: {
          create: {
            startTime: '14:00', endTime: '15:30',
            weightAfter: 985, noOfWorkers: 4, inchargeName: 'Suresh Kadam',
          },
        },
        sievingLog: {
          create: {
            sievingDone: true, meshSize: '60 mesh',
            startTime: '15:45', endTime: '17:00',
            noOfWorkers: 3, inchargeName: 'Suresh Kadam',
          },
        },
        packingLog: {
          create: {
            packingType: 'HDPE Pouch 500g',
            weightPerUnit: 0.5, totalUnitsPacked: 1960, totalQtyPacked: 980,
            unitsPerBag: 20, totalOuterPackages: 98,
            packingStart: '09:00', packingEnd: '16:00',
            labelingStart: '16:00', labelingEnd: '17:30',
            strappingStart: '17:30', strappingEnd: '18:00',
            stretchWrapping: true, noOfCartons: 98,
            noOfWorkers: 10, inchargeName: 'Suresh Kadam',
          },
        },
        qcSample: {
          create: {
            sampleCollected: true, sampleId: 'QC-RHZ-260605-01',
            collectedAtStage: 'POST_FORMULATION',
            submittedOn: '2026-06-07', rxAttached: true,
          },
        },
        inventoryHandover: {
          create: {
            sentToInventoryOn: '2026-06-08', handedOverTo: 'Manoj Store',
            leftoverQtyAt: '0 kg — fully packed',
            sfgUpdated: true,
          },
        },
      },
    })
    log(`Production Batch — RHZ-260605-01 created (COMPLETED, all 7 stage logs)`)
  }

  // SFG for completed batch
  let sfg1 = await prisma.sfgMaster.findFirst({ where: { productCode: 'RHZ-001', indentId: indent1.indentId } })
  if (!sfg1) {
    await prisma.sfgMaster.create({
      data: {
        indentId: indent1.indentId, productCode: 'RHZ-001',
        productName: 'Rhizobium japonicum WP 500g',
        targetQty: 1000, formulatedQty: 985, sfgQty: 982,
        packedQty: 980, status: 'CLOSED',
        remarks: 'Completed — 98 cartons dispatched to Krishidhan Seeds',
      },
    })
    log('SFG Master — RHZ-001 SFG record (CLOSED)')
  }

  // ── Indent for DI-2026-0002 (IN_PROGRESS — biomass + technical done) ─────
  let indent2 = await prisma.indentMaster.findFirst({ where: { batchNo: 'AZO-260615-01', diNo: 'DI-2026-0002' } })
  if (!indent2) {
    indent2 = await prisma.indentMaster.create({
      data: {
        productCode: 'AZO-001', productName: 'Azotobacter chroococcum WP 1kg',
        batchSize: 500, batchNo: 'AZO-260615-01', diNo: 'DI-2026-0002',
        plant: 'Nano', equipment: 'Nano Reactor NR-500',
        cycleBatchSize: 500, cycleNo: 1, totalCycles: 1,
        status: 'OPEN',
        details: {
          create: [
            { rmCode: 'AZO-BIO', rmName: 'Azotobacter Culture',  requiredQty: 4000, issuedQty: 4000, balanceQty: 0 },
            { rmCode: 'SIL-001', rmName: 'Silica Powder',         requiredQty: 200,  issuedQty: 200,  balanceQty: 0 },
            { rmCode: 'CAC-001', rmName: 'Calcium Carbonate',     requiredQty: 175,  issuedQty: 175,  balanceQty: 0 },
            { rmCode: 'SMP-001', rmName: 'Skim Milk Powder',      requiredQty: 50,   issuedQty: 50,   balanceQty: 0 },
          ],
        },
      },
    })
    log('Indent — IND-002 created (AZO, OPEN, in-progress)')
  }

  let batch2 = await prisma.productionBatch.findFirst({ where: { batchCode: 'AZO-260615-01' } })
  if (!batch2) {
    await prisma.productionBatch.create({
      data: {
        indentId: indent2.indentId, productCode: 'AZO-001',
        productName: 'Azotobacter chroococcum WP 1kg',
        diNo: 'DI-2026-0002', batchCode: 'AZO-260615-01',
        orderQty: 500, category: 'LIQUID', currentStage: 'FORMULATION', status: 'IN_PROGRESS',
        temperature: 30, humidity: 65, cfuTarget: '1x10⁹ CFU/gm',
        biomassFlag: true, technicalFlag: true, formulationFlag: false,
        sievingFlag: false, packingFlag: false, qcFlag: false,
        biomassInputs: {
          create: [
            {
              cultureName: 'Azotobacter chroococcum', batchNo: 'MC-AZO-2604-01',
              doi: '2026-04-20', cfuPerGram: 9e8, biomassQty: 4000,
              moisture: 70, form: 'Liquid Culture', receivedFrom: 'Cold Room 1',
              receivedDate: '2026-06-15', receivedTime: '08:00',
            },
          ],
        },
        technicalDetail: {
          create: {
            method: 'MANUAL', startTime: '09:00', endTime: '13:00',
            biomassQty: 4000, silicaQty: 200, caco3Qty: 175,
            mgStearateQty: 0, smpQty: 50,
            totalTechnicalQty: 495, qtyAfterSieving: null, wastage: null,
          },
        },
        formulationCycles: {
          create: [
            {
              cycleNo: 1, formulationDate: '2026-06-16',
              startTime: '09:00', endTime: '',
              noOfWorkers: 6, sfgUsed: false, carrierType: 'Silica',
              inchargeName: 'Suresh Kadam',
            },
          ],
        },
      },
    })
    log('Production Batch — AZO-260615-01 created (IN_PROGRESS, biomass+technical done)')
  }

  // ── Indent for DI-2026-0003 (REVIEWED — not started) ─────────────────────
  let indent3 = await prisma.indentMaster.findFirst({ where: { batchNo: 'TRIC-260620-01', diNo: 'DI-2026-0003' } })
  if (!indent3) {
    await prisma.indentMaster.create({
      data: {
        productCode: 'TRIC-001', productName: 'Trichoderma viride WP 1kg',
        batchSize: 300, batchNo: 'TRIC-260620-01', diNo: 'DI-2026-0003',
        plant: 'Botanical', equipment: 'Botanical Fermenter BF-200',
        cycleBatchSize: 300, cycleNo: 1, totalCycles: 1,
        status: 'OPEN',
        details: {
          create: [
            { rmCode: 'TRI-BIO', rmName: 'Trichoderma viride Culture', requiredQty: 1500, issuedQty: 0, balanceQty: 1500 },
            { rmCode: 'SIL-001', rmName: 'Silica Powder',              requiredQty: 120,  issuedQty: 0, balanceQty: 120  },
            { rmCode: 'CAC-001', rmName: 'Calcium Carbonate',          requiredQty: 120,  issuedQty: 0, balanceQty: 120  },
            { rmCode: 'TALC-001',rmName: 'Talc',                      requiredQty: 30,   issuedQty: 0, balanceQty: 30   },
          ],
        },
      },
    })
    log('Indent — IND-003 created (TRIC, OPEN, not started)')
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  SOM ERP — Database Seed\n')
  await seedProductMaster()
  await seedEquipmentMaster()
  await seedRecipeDb()
  await seedSequences()
  await seedCustomerProfiles()
  await seedSalesOrders()
  await seedProductionPlans()
  await seedBomSends()
  await seedPlannerLogs()
  await seedProductionData()
  console.log('\n✅  Seed complete — all records inserted / verified\n')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
