-- Restructure customer_product_profile:
-- 1. Drop old table (it had no real data yet, only schema)
-- 2. Recreate with new structure: unique on (customer_name, product_name)
--    product_code is now optional; unitQty/unitUom/inhouseName/unitPackType added

DROP TABLE IF EXISTS "customer_product_profile";

CREATE TABLE "customer_product_profile" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "customer_name"  TEXT NOT NULL,
  "product_name"   TEXT NOT NULL,
  "product_code"   TEXT,
  "inhouse_name"   TEXT,
  "active_specs"   TEXT,
  "carrier"        TEXT,
  "section_name"   TEXT,
  "unit_qty"       REAL,
  "unit_uom"       TEXT,
  "unit_pack_type" TEXT,
  "primary_pack"   TEXT,
  "secondary_pack" TEXT,
  "units_per_cs"   INTEGER,
  "total_uom"      TEXT DEFAULT 'KG',
  "label_type"     TEXT,
  "mrp"            REAL,
  "last_batch_no"  TEXT,
  "shelf_life_days" INTEGER,
  "order_count"    INTEGER NOT NULL DEFAULT 1,
  "last_ordered_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("customer_name", "product_name")
);
