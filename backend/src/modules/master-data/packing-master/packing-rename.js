// node src/modules/master-data/packing-master/packing-rename.js
// Renames seeded items to short base names; specs stay in structured fields.
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

const RENAMES = {
  // ── Bottles / Containers / Tins ──────────────────────────────────────────
  'BTL-001': 'US Tin',
  'BTL-002': 'US Tin',
  'BTL-003': 'HDPE Bottle',
  'BTL-004': 'HDPE Bottle',
  'BTL-005': 'Air Vent Bottle',
  'BTL-006': 'HDPE BP Tin',
  'BTL-007': 'HDPE BP Tin',
  'BTL-008': 'HDPE BP Tin',
  'BTL-009': 'BP Air Lid',
  'BTL-010': 'HDPE CL Tin',
  'BTL-011': 'HDPE CL Tin',
  'BTL-012': 'HDPE CL Tin',
  'BTL-013': 'HDPE CL Tin',
  'BTL-014': 'HDPE CL Tin',
  'BTL-015': 'CL Tin',
  'BTL-016': 'HDPE Triangle Container',
  'BTL-017': 'HDPE Triangle Container',
  'BTL-018': 'HDPE Triangle Container',
  'BTL-019': 'HDPE Triangle Container',
  'BTL-020': 'HDPE Round Container',
  'BTL-021': 'HDPE Barrel',
  'BTL-022': 'HDPE Barrel',
  'BTL-023': 'HDPE Barrel',
  'BTL-024': 'HDPE Barrel',
  'BTL-025': 'HM-HDPE Drum',
  'BTL-026': 'Aluminium Container',
  'BTL-027': 'PET Jar',
  'BTL-028': 'PET Jar',
  'BTL-029': 'Jar',
  'BTL-030': 'Air Vent Plug',
  // ── Pouches / Bags / Covers ───────────────────────────────────────────────
  'PCH-001': 'Handle Cover',
  'PCH-002': 'Silver Laminated Pouch',
  'PCH-003': 'Plain Laminated Pouch',
  'PCH-004': 'Silver Laminated Pouch',
  'PCH-005': 'Aluminium Bag (TLSB)',
  'PCH-006': 'LD Cover',
  'PCH-007': 'LD Cover',
  'PCH-008': 'Liner',
  // ── Corrugated Boxes / Cartons ────────────────────────────────────────────
  'CBB-001': '3 PLY CBB',
  'CBB-002': 'QUITTO Inner Box',
  'CBB-003': '5 PLY CBB',
  'CBB-004': '5 PLY CBB',
  'CBB-005': '5 PLY CBB',
  'CBB-006': '5 PLY CBB',
  'CBB-007': '5 PLY CBB',
  'CBB-008': '5 PLY CBB',
  'CBB-009': '5 PLY CBB',
  'CBB-010': '5 PLY CBB',
  'CBB-011': '5 PLY CBB',
  'CBB-012': '5 PLY CBB',
  'CBB-013': '5 PLY CBB',
  'CBB-014': '5 PLY CBB',
  'CBB-015': '5 PLY CBB',
  'CBB-016': '5 PLY CBB',
  'CBB-017': '5 PLY CBB',
  'CBB-018': '5 PLY CBB',
  'CBB-019': '5 PLY CBB',
  'CBB-020': 'QUITTO Shipper Box',
  'CBB-021': '5 PLY CBB',
  'CBB-022': '5 PLY CBB',
  'CBB-023': '5 PLY CBB',
  'CBB-024': '5 PLY CBB',
  'CBB-025': '5 PLY CBB',
  'CBB-026': '5 PLY CBB',
  'CBB-027': '5 PLY CBB',
  'CBB-028': '7 PLY CBB',
  'CBB-029': '7 PLY CBB',
  'CBB-030': '7 PLY CBB',
}

async function main() {
  console.log('\n✏️  Renaming packing materials to short base names...\n')
  let count = 0
  for (const [code, name] of Object.entries(RENAMES)) {
    await prisma.$executeRaw`
      UPDATE packing_materials SET item_name = ${name} WHERE item_code = ${code}
    `
    console.log(`  ${code}  →  ${name}`)
    count++
  }
  console.log(`\n✅  Renamed ${count} items.\n`)
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
