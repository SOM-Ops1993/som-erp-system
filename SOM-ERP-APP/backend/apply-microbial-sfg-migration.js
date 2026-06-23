/**
 * Microbial SFG Module — Database Migration
 * Creates: microbe_master, microbial_sfg_container, microbial_sfg_inward, microbial_sfg_allocation
 * Also adds: required_cfu + microbe_code columns to recipe_db
 *
 * Run once:  node apply-microbial-sfg-migration.js
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Applying Microbial SFG migrations…\n')

  // ── 1. Microbe Master ────────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS microbe_master (
      microbe_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      microbe_name TEXT NOT NULL,
      microbe_code TEXT UNIQUE NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('✅ microbe_master')

  // ── 2. Microbial SFG Container ───────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS microbial_sfg_container (
      container_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      container_code TEXT UNIQUE NOT NULL,
      microbe_id     TEXT REFERENCES microbe_master(microbe_id),
      microbe_code   TEXT NOT NULL,
      microbe_name   TEXT NOT NULL,
      microbe_type   TEXT NOT NULL,
      type_code      TEXT NOT NULL,
      seq_no         INTEGER NOT NULL DEFAULT 1,
      location       TEXT,
      capacity_kg    DOUBLE PRECISION,
      current_qty_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
      fill_status    TEXT NOT NULL DEFAULT 'EMPTY',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('✅ microbial_sfg_container')

  // ── 3. Microbial SFG Inward ──────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS microbial_sfg_inward (
      inward_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      container_id       TEXT REFERENCES microbial_sfg_container(container_id),
      container_code     TEXT NOT NULL,
      microbe_id         TEXT REFERENCES microbe_master(microbe_id),
      microbe_code       TEXT NOT NULL,
      microbe_name       TEXT NOT NULL,
      microbe_type       TEXT NOT NULL,
      inhouse_cfu_per_g  DOUBLE PRECISION NOT NULL,
      biomass_batch_code TEXT NOT NULL,
      date_of_harvest    DATE NOT NULL,
      total_qty_kg       DOUBLE PRECISION NOT NULL,
      remaining_qty_kg   DOUBLE PRECISION NOT NULL,
      location           TEXT,
      moisture           DOUBLE PRECISION,
      shelf_life_days    INTEGER,
      fill_status        TEXT NOT NULL DEFAULT 'PARTIAL',
      status             TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('✅ microbial_sfg_inward')

  // ── 4. Microbial SFG Allocation ──────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS microbial_sfg_allocation (
      allocation_id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      plan_id               TEXT NOT NULL,
      inward_id             TEXT REFERENCES microbial_sfg_inward(inward_id),
      container_code        TEXT NOT NULL,
      microbe_code          TEXT NOT NULL,
      microbe_name          TEXT NOT NULL,
      microbe_type          TEXT NOT NULL,
      allocated_qty_kg      DOUBLE PRECISION NOT NULL,
      multiplication_factor DOUBLE PRECISION NOT NULL DEFAULT 1,
      required_cfu_per_g    DOUBLE PRECISION,
      inhouse_cfu_per_g     DOUBLE PRECISION,
      order_qty_kg          DOUBLE PRECISION,
      status                TEXT NOT NULL DEFAULT 'RESERVED',
      notified_at           TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('✅ microbial_sfg_allocation')

  // ── 5. Extend recipe_db with microbe fields ──────────────────────────────────
  await prisma.$executeRawUnsafe(`
    ALTER TABLE recipe_db
      ADD COLUMN IF NOT EXISTS is_microbe   BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS microbe_code TEXT,
      ADD COLUMN IF NOT EXISTS required_cfu DOUBLE PRECISION
  `)
  console.log('✅ recipe_db — is_microbe, microbe_code, required_cfu columns added')

  // ── 6. Container sequence helper ─────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS microbial_sfg_container_seq (
      microbe_code TEXT NOT NULL,
      type_code    TEXT NOT NULL,
      seq          INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (microbe_code, type_code)
    )
  `)
  console.log('✅ microbial_sfg_container_seq')

  console.log('\n✅  All Microbial SFG migrations applied successfully!')
}

main()
  .catch(e => { console.error('Migration failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
