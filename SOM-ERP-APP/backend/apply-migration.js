/**
 * Run ALL pending migrations: equipment fields + PO tracking + Production Master tables.
 * Run once:  node apply-migration.js
 * Then:      npx prisma generate  (regenerates client with new fields)
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Applying migrations…\n')

  await prisma.$executeRawUnsafe(`ALTER TABLE "equipment_master" ADD COLUMN IF NOT EXISTS "working_volume" DOUBLE PRECISION`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "equipment_master" ADD COLUMN IF NOT EXISTS "operation" TEXT NOT NULL DEFAULT ''`)
  console.log('✅ equipment_master columns')

  await prisma.$executeRawUnsafe(`ALTER TABLE "indent_master" ADD COLUMN IF NOT EXISTS "po_sent_at" TIMESTAMPTZ`)
  console.log('✅ indent_master.po_sent_at')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "production_batch" (
      "id" TEXT PRIMARY KEY, "indent_id" TEXT NOT NULL REFERENCES "indent_master"("indent_id"),
      "product_code" TEXT NOT NULL, "product_name" TEXT NOT NULL,
      "di_no" TEXT NOT NULL, "batch_code" TEXT NOT NULL, "order_qty" DOUBLE PRECISION NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'POWDER', "current_stage" TEXT NOT NULL DEFAULT 'BIOMASS',
      "status" TEXT NOT NULL DEFAULT 'DRAFT', "temperature" DOUBLE PRECISION, "humidity" DOUBLE PRECISION,
      "cfu_target" TEXT, "biomass_flag" BOOLEAN NOT NULL DEFAULT false,
      "technical_flag" BOOLEAN NOT NULL DEFAULT false, "formulation_flag" BOOLEAN NOT NULL DEFAULT false,
      "sieving_flag" BOOLEAN NOT NULL DEFAULT false, "packing_flag" BOOLEAN NOT NULL DEFAULT false,
      "qc_flag" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
  console.log('✅ production_batch')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "biomass_input" (
      "id" TEXT PRIMARY KEY, "batch_id" TEXT NOT NULL REFERENCES "production_batch"("id"),
      "culture_name" TEXT NOT NULL DEFAULT '', "batch_no" TEXT NOT NULL DEFAULT '',
      "doi" TEXT NOT NULL DEFAULT '', "cfu_per_gram" DOUBLE PRECISION, "biomass_qty" DOUBLE PRECISION,
      "moisture" DOUBLE PRECISION, "form" TEXT NOT NULL DEFAULT '',
      "received_from" TEXT NOT NULL DEFAULT '', "received_date" TEXT NOT NULL DEFAULT '',
      "received_time" TEXT NOT NULL DEFAULT '', "flagged" BOOLEAN NOT NULL DEFAULT false
    )`)
  console.log('✅ biomass_input')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "technical_detail" (
      "id" TEXT PRIMARY KEY, "batch_id" TEXT UNIQUE NOT NULL REFERENCES "production_batch"("id"),
      "method" TEXT NOT NULL DEFAULT 'MANUAL', "start_time" TEXT NOT NULL DEFAULT '',
      "end_time" TEXT NOT NULL DEFAULT '', "biomass_qty" DOUBLE PRECISION,
      "silica_qty" DOUBLE PRECISION, "caco3_qty" DOUBLE PRECISION,
      "mg_stearate_qty" DOUBLE PRECISION, "smp_qty" DOUBLE PRECISION,
      "total_technical_qty" DOUBLE PRECISION, "qty_after_sieving" DOUBLE PRECISION,
      "wastage" DOUBLE PRECISION, "flagged" BOOLEAN NOT NULL DEFAULT false
    )`)
  console.log('✅ technical_detail')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "formulation_cycle" (
      "id" TEXT PRIMARY KEY, "batch_id" TEXT NOT NULL REFERENCES "production_batch"("id"),
      "cycle_no" INTEGER NOT NULL, "formulation_date" TEXT NOT NULL DEFAULT '',
      "start_time" TEXT NOT NULL DEFAULT '', "end_time" TEXT NOT NULL DEFAULT '',
      "no_of_workers" INTEGER, "sfg_used" BOOLEAN NOT NULL DEFAULT false,
      "sfg_id" TEXT, "sfg_di_no" TEXT, "sfg_qty_used" DOUBLE PRECISION,
      "carrier_type" TEXT, "incharge_name" TEXT, "flagged" BOOLEAN NOT NULL DEFAULT false
    )`)
  console.log('✅ formulation_cycle')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "unloading_log" (
      "id" TEXT PRIMARY KEY, "batch_id" TEXT UNIQUE NOT NULL REFERENCES "production_batch"("id"),
      "start_time" TEXT NOT NULL DEFAULT '', "end_time" TEXT NOT NULL DEFAULT '',
      "weight_after" DOUBLE PRECISION, "no_of_workers" INTEGER,
      "incharge_name" TEXT, "flagged" BOOLEAN NOT NULL DEFAULT false
    )`)
  console.log('✅ unloading_log')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "sieving_log" (
      "id" TEXT PRIMARY KEY, "batch_id" TEXT UNIQUE NOT NULL REFERENCES "production_batch"("id"),
      "sieving_done" BOOLEAN NOT NULL DEFAULT false, "mesh_size" TEXT,
      "start_time" TEXT NOT NULL DEFAULT '', "end_time" TEXT NOT NULL DEFAULT '',
      "no_of_workers" INTEGER, "incharge_name" TEXT, "flagged" BOOLEAN NOT NULL DEFAULT false
    )`)
  console.log('✅ sieving_log')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "packing_log" (
      "id" TEXT PRIMARY KEY, "batch_id" TEXT UNIQUE NOT NULL REFERENCES "production_batch"("id"),
      "packing_type" TEXT, "weight_per_unit" DOUBLE PRECISION, "total_units_packed" INTEGER,
      "total_qty_packed" DOUBLE PRECISION, "units_per_bag" INTEGER, "total_outer_packages" INTEGER,
      "packing_start" TEXT NOT NULL DEFAULT '', "packing_end" TEXT NOT NULL DEFAULT '',
      "labeling_start" TEXT NOT NULL DEFAULT '', "labeling_end" TEXT NOT NULL DEFAULT '',
      "strapping_start" TEXT NOT NULL DEFAULT '', "strapping_end" TEXT NOT NULL DEFAULT '',
      "stretch_wrapping" BOOLEAN NOT NULL DEFAULT false, "no_of_cartons" INTEGER,
      "no_of_workers" INTEGER, "incharge_name" TEXT, "flagged" BOOLEAN NOT NULL DEFAULT false
    )`)
  console.log('✅ packing_log')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "qc_sample" (
      "id" TEXT PRIMARY KEY, "batch_id" TEXT UNIQUE NOT NULL REFERENCES "production_batch"("id"),
      "sample_collected" BOOLEAN NOT NULL DEFAULT false, "sample_id" TEXT,
      "collected_at_stage" TEXT, "submitted_on" TEXT,
      "rx_attached" BOOLEAN NOT NULL DEFAULT false, "flagged" BOOLEAN NOT NULL DEFAULT false
    )`)
  console.log('✅ qc_sample')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "inventory_handover" (
      "id" TEXT PRIMARY KEY, "batch_id" TEXT UNIQUE NOT NULL REFERENCES "production_batch"("id"),
      "sent_to_inventory_on" TEXT, "handed_over_to" TEXT,
      "leftover_qty_at" TEXT, "sfg_updated" BOOLEAN NOT NULL DEFAULT false
    )`)
  console.log('✅ inventory_handover')

  console.log('\n✅ All migrations applied.')
  console.log('👉 Now run:  npx prisma generate  (in the backend folder)')
  await prisma.$disconnect()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
