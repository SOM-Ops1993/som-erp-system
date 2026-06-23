-- ============================================================
-- SOM ERP — Customer Master Migration
-- Run in Neon SQL Editor
-- ============================================================

-- 0. Create notification table (fixes cron error)
CREATE TABLE IF NOT EXISTS notification (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. Add units_per_cs to sales_order_item (was missing)
ALTER TABLE sales_order_item
  ADD COLUMN IF NOT EXISTS units_per_cs INTEGER;

-- 2. Configurable options table (Carriers, Primary Packs, Secondary Packs)
CREATE TABLE IF NOT EXISTS configurable_option (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,    -- CARRIER | PRIMARY_PACK | SECONDARY_PACK
  value       TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, value)
);

-- Seed: Carriers
INSERT INTO configurable_option (category, value, sort_order) VALUES
  ('CARRIER', 'Dextrose',             1),
  ('CARRIER', 'Talc',                 2),
  ('CARRIER', 'Lactose',              3),
  ('CARRIER', 'HSCAS',                4),
  ('CARRIER', 'China Clay',           5),
  ('CARRIER', 'Diatomaceous Earth',   6),
  ('CARRIER', 'LSP',                  7),
  ('CARRIER', 'Precipitated CaCO3',   8),
  ('CARRIER', 'Silica',               9)
ON CONFLICT (category, value) DO NOTHING;

-- Seed: Primary Packs
INSERT INTO configurable_option (category, value, sort_order) VALUES
  ('PRIMARY_PACK', 'LD Pouch',                   1),
  ('PRIMARY_PACK', 'AL Pouch',                   2),
  ('PRIMARY_PACK', 'HDPE Jar',                   3),
  ('PRIMARY_PACK', '100ml Bottle (Round)',        4),
  ('PRIMARY_PACK', '100ml Bottle (Regular)',      5),
  ('PRIMARY_PACK', '100ml Bottle (Triangle)',     6),
  ('PRIMARY_PACK', '200ml Bottle (Round)',        7),
  ('PRIMARY_PACK', '200ml Bottle (Regular)',      8),
  ('PRIMARY_PACK', '200ml Bottle (Triangle)',     9),
  ('PRIMARY_PACK', '500ml Bottle (Round)',       10),
  ('PRIMARY_PACK', '500ml Bottle (Regular)',     11),
  ('PRIMARY_PACK', '500ml Bottle (Triangle)',    12),
  ('PRIMARY_PACK', '1L Bottle (Round)',          13),
  ('PRIMARY_PACK', '1L Bottle (Regular)',        14),
  ('PRIMARY_PACK', '1L Bottle (Triangle)',       15)
ON CONFLICT (category, value) DO NOTHING;

-- Seed: Secondary Packs
INSERT INTO configurable_option (category, value, sort_order) VALUES
  ('SECONDARY_PACK', 'W-CBB',              1),
  ('SECONDARY_PACK', 'B-CBB',              2),
  ('SECONDARY_PACK', 'OMB 30 (30kg Drum)', 3),
  ('SECONDARY_PACK', 'OMB 50 (50kg Drum)', 4),
  ('SECONDARY_PACK', '25Kg HDPE Bag',      5),
  ('SECONDARY_PACK', '50Kg HDPE Bag',      6),
  ('SECONDARY_PACK', 'Cartons',            7),
  ('SECONDARY_PACK', '25L Jerry Can',      8),
  ('SECONDARY_PACK', '50L Barrel',         9),
  ('SECONDARY_PACK', '5L Can',            10),
  ('SECONDARY_PACK', '10L Can',           11),
  ('SECONDARY_PACK', 'Others',            12)
ON CONFLICT (category, value) DO NOTHING;

-- Verify
SELECT category, count(*) FROM configurable_option GROUP BY category ORDER BY category;
SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_order_item' AND column_name = 'units_per_cs';
