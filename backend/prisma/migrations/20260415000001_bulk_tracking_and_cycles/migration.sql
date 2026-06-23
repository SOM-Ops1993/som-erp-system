-- Migration: Bulk Tracking System + Cycle Batch Size for Indents
-- Date: 2026-04-15

-- 1. Add trackingType to rm_master
ALTER TABLE "rm_master" ADD COLUMN IF NOT EXISTS "tracking_type" TEXT NOT NULL DEFAULT 'PACK';

-- 2. Add cycle fields to indent_master
ALTER TABLE "indent_master" ADD COLUMN IF NOT EXISTS "cycle_batch_size" DOUBLE PRECISION;
ALTER TABLE "indent_master" ADD COLUMN IF NOT EXISTS "cycle_no" INTEGER;
ALTER TABLE "indent_master" ADD COLUMN IF NOT EXISTS "total_cycles" INTEGER;

-- 3. Create bulk_location table
CREATE TABLE IF NOT EXISTS "bulk_location" (
  "location_id"   TEXT         NOT NULL,
  "location_name" TEXT         NOT NULL,
  "item_code"     TEXT         NOT NULL,
  "item_name"     TEXT         NOT NULL,
  "uom"           TEXT         NOT NULL DEFAULT 'KG',
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "bulk_location_pkey" PRIMARY KEY ("location_id")
);

-- 4. Create bulk_lot_entry table
CREATE TABLE IF NOT EXISTS "bulk_lot_entry" (
  "id"             TEXT         NOT NULL,
  "location_id"    TEXT         NOT NULL,
  "item_code"      TEXT         NOT NULL,
  "item_name"      TEXT         NOT NULL,
  "lot_no"         TEXT         NOT NULL,
  "supplier"       TEXT,
  "invoice_no"     TEXT,
  "received_date"  TIMESTAMPTZ,
  "received_qty"   DOUBLE PRECISION NOT NULL,
  "remaining_qty"  DOUBLE PRECISION NOT NULL,
  "uom"            TEXT         NOT NULL DEFAULT 'KG',
  "status"         TEXT         NOT NULL DEFAULT 'ACTIVE',
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "bulk_lot_entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bulk_lot_entry_location_id_fkey" FOREIGN KEY ("location_id")
    REFERENCES "bulk_location"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 5. Create bulk_lot_sequence table (for lot numbering)
CREATE TABLE IF NOT EXISTS "bulk_lot_sequence" (
  "item_code" TEXT    NOT NULL,
  "year"      INTEGER NOT NULL,
  "seq"       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "bulk_lot_sequence_pkey" PRIMARY KEY ("item_code", "year")
);

-- 6. Index for performance
CREATE INDEX IF NOT EXISTS "bulk_lot_entry_location_id_idx" ON "bulk_lot_entry"("location_id");
CREATE INDEX IF NOT EXISTS "bulk_lot_entry_item_code_idx"   ON "bulk_lot_entry"("item_code");
CREATE INDEX IF NOT EXISTS "bulk_lot_entry_status_idx"      ON "bulk_lot_entry"("status");
