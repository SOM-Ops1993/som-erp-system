// Run (with backend STOPPED): node src/modules/master-data/packing-master/packing-seed.js
// Uses Prisma $executeRaw so it works even before "npx prisma generate"
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

// ── UUID helper (no external deps) ───────────────────────────────────────────

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ── Code generator ────────────────────────────────────────────────────────────

const PREFIXES = { BOTTLES_TINS: 'BTL', POUCHES_BAGS: 'PCH', CORRUGATED_BOXES: 'CBB' }
const counters  = { BOTTLES_TINS: 0, POUCHES_BAGS: 0, CORRUGATED_BOXES: 0 }

function nextCode(cat) {
  counters[cat]++
  return `${PREFIXES[cat]}-${String(counters[cat]).padStart(3, '0')}`
}

// ── Insert one item via raw SQL ───────────────────────────────────────────────

async function insert(category, item) {
  const itemCode    = nextCode(category)
  const hasCapacity = item.capacity != null
  await prisma.$executeRaw`
    INSERT INTO packing_materials (
      id, item_code, item_name, category, sub_type, material,
      capacity, capacity_unit, length, width, height,
      ply, shape, color, laminate, contents_spec, pack_count,
      uom, notes, is_active, created_at, updated_at
    ) VALUES (
      ${uuid()}::uuid,
      ${itemCode}, ${item.itemName}, ${category},
      ${item.subType      ?? null},
      ${item.material     ?? null},
      ${hasCapacity ? item.capacity         : null}::numeric,
      ${hasCapacity ? (item.capacityUnit ?? null) : null},
      ${item.length       ?? null}::numeric,
      ${item.width        ?? null}::numeric,
      ${item.height       ?? null}::numeric,
      ${item.ply          ?? null}::int,
      ${item.shape        ?? null},
      ${item.color        ?? null},
      ${item.laminate     ?? null},
      ${item.contentsSpec ?? null},
      ${item.packCount    ?? null}::int,
      'Nos',
      ${item.notes        ?? null},
      true, now(), now()
    )
  `
  return itemCode
}

// ── Data ──────────────────────────────────────────────────────────────────────

const BOTTLES_TINS = [
  // US Tins
  { itemName: 'US Tins - 1 Kg',                                subType: 'Tin',        material: 'US Tin',    capacity: 1,    capacityUnit: 'KG' },
  { itemName: 'US Tins - 500 Grams',                           subType: 'Tin',        material: 'US Tin',    capacity: 500,  capacityUnit: 'GMS' },
  // HDPE Bottles
  { itemName: 'HDPE Bottles - 5 LT',                           subType: 'Bottle',     material: 'HDPE',      capacity: 5,    capacityUnit: 'LT',  shape: 'Round' },
  { itemName: 'HDPE Bottles - 500ML (AMWAY Model)',            subType: 'Bottle',     material: 'HDPE',      capacity: 500,  capacityUnit: 'ML',  notes: 'AMWAY Model' },
  { itemName: 'C 5 Lit White 48mm Air Vent Bottle',            subType: 'Bottle',     material: 'HDPE',      capacity: 5,    capacityUnit: 'LT',  color: 'White', notes: '48mm air vent' },
  // BP Tins
  { itemName: 'HDPE BP Tins - 1000ml',                         subType: 'Tin',        material: 'BP Tin',    capacity: 1000, capacityUnit: 'ML' },
  { itemName: 'HDPE Bottles BP Tins - 500 ML',                 subType: 'Bottle',     material: 'BP Tin',    capacity: 500,  capacityUnit: 'ML' },
  { itemName: 'HDPE Bottles BP Tins - 100ml',                  subType: 'Bottle',     material: 'BP Tin',    capacity: 100,  capacityUnit: 'ML' },
  { itemName: 'BP AIRLIDS',                                     subType: 'Lid / Cap',  material: 'BP Tin',    notes: 'Air lids' },
  // CL Tins
  { itemName: 'HDPE CL Tins - 500 GMS',                        subType: 'Tin',        material: 'CL Tin',    capacity: 500,  capacityUnit: 'GMS' },
  { itemName: 'HDPE CL Tins - 200 GMS',                        subType: 'Tin',        material: 'CL Tin',    capacity: 200,  capacityUnit: 'GMS' },
  { itemName: 'HDPE CL Tins - 100 GMS',                        subType: 'Tin',        material: 'CL Tin',    capacity: 100,  capacityUnit: 'GMS' },
  { itemName: 'HDPE CL Tin - 50 Gms',                          subType: 'Tin',        material: 'CL Tin',    capacity: 50,   capacityUnit: 'GMS' },
  { itemName: 'HDPE CL Tins - 1 KG',                           subType: 'Tin',        material: 'CL Tin',    capacity: 1,    capacityUnit: 'KG' },
  { itemName: 'CL Tins - 100 GMS',                             subType: 'Tin',        material: 'CL Tin',    capacity: 100,  capacityUnit: 'GMS' },
  // HDPE Containers
  { itemName: 'HDPE Containers Triangle - 1 LT',               subType: 'Container',  material: 'HDPE',      capacity: 1,    capacityUnit: 'LT',  shape: 'Triangle' },
  { itemName: 'HDPE Containers Triangle - 500 ML',             subType: 'Container',  material: 'HDPE',      capacity: 500,  capacityUnit: 'ML',  shape: 'Triangle' },
  { itemName: 'HDPE Containers Triangle - 100ML',              subType: 'Container',  material: 'HDPE',      capacity: 100,  capacityUnit: 'ML',  shape: 'Triangle' },
  { itemName: 'HDPE Containers Triangle - 50ml',               subType: 'Container',  material: 'HDPE',      capacity: 50,   capacityUnit: 'ML',  shape: 'Triangle' },
  { itemName: 'HDPE Containers R1 Model - 500G',               subType: 'Container',  material: 'HDPE',      capacity: 500,  capacityUnit: 'GMS', shape: 'Round',    notes: 'R1 Model' },
  // HDPE Barrels
  { itemName: 'HDPE Barrels - 210 Ltrs',                       subType: 'Barrel',     material: 'HDPE',      capacity: 210,  capacityUnit: 'LT' },
  { itemName: 'HDPE Barrels - 25 Lit Natural White 1.8Kg',     subType: 'Barrel',     material: 'HDPE',      capacity: 25,   capacityUnit: 'LT',  color: 'White' },
  { itemName: 'HDPE Barrels - 25 Liters Blue 1.4Kg',           subType: 'Barrel',     material: 'HDPE',      capacity: 25,   capacityUnit: 'LT',  color: 'Blue' },
  { itemName: 'HDPE Barrels OMB 50',                           subType: 'Barrel',     material: 'HDPE',      capacity: 50,   capacityUnit: 'LT',  notes: 'OMB type' },
  // HM-HDPE Drums
  { itemName: 'HM-HDPE Drums - IOT 30 Ltrs',                  subType: 'Drum',       material: 'HM-HDPE',   capacity: 30,   capacityUnit: 'LT',  notes: 'IOT type' },
  // Aluminium
  { itemName: 'Aluminium Containers - 1 LT',                   subType: 'Container',  material: 'Aluminium', capacity: 1,    capacityUnit: 'LT' },
  // PET Jars
  { itemName: 'PET Jar 4Kg Cap with Wad - Blue',               subType: 'Jar',        material: 'PET',       capacity: 4,    capacityUnit: 'KG',  color: 'Blue' },
  { itemName: 'PET Jar 1Kg Cap - Blue',                        subType: 'Jar',        material: 'PET',       capacity: 1,    capacityUnit: 'KG',  color: 'Blue' },
  { itemName: '10 Lit Jar with Plain Cap',                     subType: 'Jar',                               capacity: 10,   capacityUnit: 'LT' },
  // Plugs / Vents
  { itemName: '45mm Air Vent Plug',                            subType: 'Plug / Vent', notes: '45mm diameter' },
]

const POUCHES_BAGS = [
  { itemName: '1Kg Handle Covers L300 x W200mm White Bilaminated',   subType: 'Cover',  material: 'Bilaminated',         width: 200, height: 300, capacity: 1,   capacityUnit: 'KG',  color: 'White' },
  { itemName: 'Plain Laminated Film Silver Pouches 90x60mm - 10g',   subType: 'Pouch',  material: 'Laminated Film',      width: 90,  height: 60,  capacity: 10,  capacityUnit: 'GMS', color: 'Silver' },
  { itemName: 'Plain Laminated Film Pouch 200x150mm Plain - 250gsm', subType: 'Pouch',  material: 'Laminated Film',      width: 200, height: 150, color: 'Plain', notes: '250gsm film weight' },
  { itemName: 'Plain Laminated Film Silver 150x125mm - 100 Grams',   subType: 'Pouch',  material: 'Laminated Film',      width: 150, height: 125, capacity: 100, capacityUnit: 'GMS', color: 'Silver' },
  { itemName: 'Aluminium Bags (TLSB) - W200mm x H270mm',            subType: 'Bag',    material: 'Aluminium (TLSB)',    width: 200, height: 270 },
  { itemName: 'LD Covers 2Kg (H318 x W240mm)',                       subType: 'Cover',  material: 'LD (Low Density PE)', width: 240, height: 318, capacity: 2,   capacityUnit: 'KG' },
  { itemName: 'LD Covers 1Kg (H270 x W182mm)',                       subType: 'Cover',  material: 'LD (Low Density PE)', width: 182, height: 270, capacity: 1,   capacityUnit: 'KG' },
  { itemName: 'Liners 50 KG (24 x 36 inch)',                         subType: 'Liner',  capacity: 50, capacityUnit: 'KG', notes: '24 x 36 inch size' },
]

const CORRUGATED_BOXES = [
  // 3 PLY
  { itemName: 'CBB Baby 3 PLY - 1 KG',                                               ply: 3,                                                                                          contentsSpec: '1Kg' },
  { itemName: "CBB's 3 PLY QUITTO Inner Box 100mlx20 - 220x175x160mm OD",           ply: 3, subType: 'Inner Box',                                   length: 220, width: 175, height: 160, contentsSpec: '100mlx20',           packCount: 20 },
  // 5 PLY — Brown
  { itemName: 'Corrugated Box BX-001 - 305x205x305mm',                               ply: 5, color: 'Brown',                                        length: 305, width: 205, height: 305 },
  { itemName: "CBB's 365x295x210 MM OD - 20x500ml",                                  ply: 5, color: 'Brown',                                        length: 365, width: 295, height: 210, contentsSpec: '20x500ml',           packCount: 20 },
  { itemName: "CBB's 5 Ply COPIO Boxes - 325x245x220mm",                             ply: 5, color: 'Brown',                                        length: 325, width: 245, height: 220 },
  { itemName: 'CBB - 10x1 LT Triangle',                                               ply: 5,                                                                                          contentsSpec: '10x1Lt Triangle',    packCount: 10 },
  { itemName: '5 Ply Corrugated Box - 305x205x305mm',                                 ply: 5, color: 'Brown',                                        length: 305, width: 205, height: 305 },
  { itemName: "CBB's 280x280x405 MM OD - 100ml x 100 Nos with Pads",                ply: 5,                                                        length: 280, width: 280, height: 405, contentsSpec: '100mlx100Nos with pads', packCount: 100 },
  { itemName: "CBB's 5 PLY 280x280x210 MM OD - 100ML x 50 Nos",                    ply: 5,                                                        length: 280, width: 280, height: 210, contentsSpec: '100mlx50Nos',        packCount: 50 },
  { itemName: "5 PLY Brown CBB's 400x320x210 MM OD - 500ML x 20 Nos Triangle",     ply: 5, color: 'Brown',                                        length: 400, width: 320, height: 210, contentsSpec: '500mlx20Nos Triangle', packCount: 20 },
  { itemName: "CBB's 5 Ply Brown 340x270x280 MM OD - 40x250ml Round Bottles",      ply: 5, color: 'Brown',                                        length: 340, width: 270, height: 280, contentsSpec: '40x250ml Round Bottles', packCount: 40 },
  { itemName: "CBB's 280x280x405 MM OD - 100ml x 100 Nos",                          ply: 5,                                                        length: 280, width: 280, height: 405, contentsSpec: '100mlx100Nos',       packCount: 100 },
  { itemName: "CBB's 5 PLY 280x280x210 MM OD - 50x100ML",                           ply: 5,                                                        length: 280, width: 280, height: 210, contentsSpec: '50x100ml',           packCount: 50 },
  { itemName: '5 PLY Corrugated Box - 575x230x250mm',                                ply: 5, color: 'Brown',                                        length: 575, width: 230, height: 250 },
  { itemName: "5 PLY Brown CBB's 490x490x200 MM OD - 20Gx100x10 Nos",              ply: 5, color: 'Brown',                                        length: 490, width: 490, height: 200, contentsSpec: '20gx100x10Nos' },
  { itemName: "5 PLY Brown CBB's 500x200x245 MM OD - 10x1Lt Triangular",           ply: 5, color: 'Brown',                                        length: 500, width: 200, height: 245, contentsSpec: '10x1Lt Triangular',  packCount: 10 },
  { itemName: 'CBBs 5 PLY - 4 KG PET JAR',                                           ply: 5,                                                                                          contentsSpec: '4Kg PET Jar' },
  { itemName: "5 PLY Brown CBB's - 1LT x 10 Suelo Vida Opti (L670xW310xH270mm)",  ply: 5, color: 'Brown',                                        length: 670, width: 310, height: 270, contentsSpec: '1Ltx10 Suelo Vida Opti', packCount: 10 },
  { itemName: "CBB's 5 Ply 330x260x150mm - 20x250ml",                               ply: 5,                                                        length: 330, width: 260, height: 150, contentsSpec: '20x250ml',           packCount: 20 },
  { itemName: "CBB's 5 PLY QUITTO Shipper 100mlx20x4 - 460x370x175mm OD",          ply: 5, subType: 'Shipper Box',                                 length: 460, width: 370, height: 175, contentsSpec: '100mlx20x4',         packCount: 80 },
  // 5 PLY — White
  { itemName: '5 Ply Corrugated Box White Duplex - 460x340x180mm',                   ply: 5, color: 'White', laminate: 'White Duplex',              length: 460, width: 340, height: 180 },
  { itemName: '5 Ply Corrugated Box - 460x340x180mm',                                ply: 5, color: 'White',                                        length: 460, width: 340, height: 180 },
  // 5 PLY — Golden Yellow
  { itemName: "CBB'S 5 PLY G.YELLOW 1LtX10 Round Bottles (460x190x260MM OD)",      ply: 5, color: 'Golden Yellow',                                 length: 460, width: 190, height: 260, contentsSpec: '10x1Lt Round Bottles', packCount: 10 },
  { itemName: '5 PLY CBB Golden Yellow 490x300x190 MM OD - 15Kgs',                  ply: 5, color: 'Golden Yellow',                                 length: 490, width: 300, height: 190, contentsSpec: '15Kgs' },
  { itemName: "CBB'S 5 PLY G.YELLOW 500Gx20 CL Tins (570x470x178 MM OD)",          ply: 5, color: 'Golden Yellow',                                 length: 570, width: 470, height: 178, contentsSpec: '500gx20 CL Tins',    packCount: 20 },
  // 5 PLY — ITC Laminate
  { itemName: "CBB's 5 Ply 490x490x195 MM - 10Kg ITC Top",                          ply: 5, laminate: 'ITC Top',                                   length: 490, width: 490, height: 195, contentsSpec: '10Kg' },
  { itemName: "5 PLY CBB's 325x245x230 MM OD - 3Kg x 4 ITC TOP",                  ply: 5, laminate: 'ITC Top',                                   length: 325, width: 245, height: 230, contentsSpec: '3Kgx4' },
  // 7 PLY
  { itemName: "CBB's 7 Ply 333x273x298 MM OD - ITC White Board",                   ply: 7, laminate: 'ITC White Board',                           length: 333, width: 273, height: 298 },
  { itemName: "CBB's 7 PLY 365x295x210 MM OD - 20x500ml ITC Laminated",            ply: 7, laminate: 'ITC Laminated',                              length: 365, width: 295, height: 210, contentsSpec: '20x500ml',           packCount: 20 },
  { itemName: "CBB's 7 PLY 500x355x250 MM OD - 8KG ITC Laminated (Biosum SPAIN)",  ply: 7, laminate: 'ITC Laminated',                              length: 500, width: 355, height: 250, contentsSpec: '8Kg',                notes: 'Biosum SPAIN' },
]

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Seeding packing materials...\n')

  const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM packing_materials WHERE is_active = true`
  if (count > 0) {
    console.log(`⚠️  ${count} records already exist. Skipping.`)
    console.log('   To re-seed run: DELETE FROM packing_materials;\n')
    return
  }

  for (const item of BOTTLES_TINS) {
    const code = await insert('BOTTLES_TINS', item)
    console.log(`  ✓  ${code}  ${item.itemName}`)
  }
  console.log()
  for (const item of POUCHES_BAGS) {
    const code = await insert('POUCHES_BAGS', item)
    console.log(`  ✓  ${code}  ${item.itemName}`)
  }
  console.log()
  for (const item of CORRUGATED_BOXES) {
    const code = await insert('CORRUGATED_BOXES', item)
    console.log(`  ✓  ${code}  ${item.itemName}`)
  }

  const total = BOTTLES_TINS.length + POUCHES_BAGS.length + CORRUGATED_BOXES.length
  console.log(`\n✅  Done! Inserted ${total} packing materials.`)
  console.log(`   BTL: ${BOTTLES_TINS.length}  |  PCH: ${POUCHES_BAGS.length}  |  CBB: ${CORRUGATED_BOXES.length}\n`)
}

main()
  .catch(e => { console.error('\n❌  Seed failed:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
