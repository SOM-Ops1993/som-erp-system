-- Gate schema patch — run once on any existing database
-- These columns have already been applied to the dev DB on 2026-06-13.
-- Run this on staging / production before deploying.

-- gate_inward: allow supplier_name-only inserts (drop old NOT NULL guards)
ALTER TABLE gate_inward ALTER COLUMN total_qty DROP NOT NULL;
ALTER TABLE gate_inward ALTER COLUMN uom       DROP NOT NULL;

-- gate_outward: add new columns for simplified gate workflow
ALTER TABLE gate_outward ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(300);
ALTER TABLE gate_outward ADD COLUMN IF NOT EXISTS invoice_no    VARCHAR(100);
ALTER TABLE gate_outward ADD COLUMN IF NOT EXISTS status        VARCHAR(50) DEFAULT 'pending';
