CREATE TABLE IF NOT EXISTS "customer_product_profile" (
    "id"              TEXT NOT NULL,
    "customer_name"   TEXT NOT NULL,
    "product_code"    TEXT NOT NULL,
    "product_name"    TEXT NOT NULL,
    "active_specs"    TEXT,
    "carrier"         TEXT,
    "section_name"    TEXT,
    "primary_pack"    TEXT,
    "secondary_pack"  TEXT,
    "units_per_cs"    INTEGER,
    "total_uom"       TEXT DEFAULT 'KG',
    "label_type"      TEXT,
    "mrp"             DOUBLE PRECISION,
    "last_batch_no"   TEXT,
    "shelf_life_days" INTEGER,
    "order_count"     INTEGER NOT NULL DEFAULT 1,
    "last_ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_product_profile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_product_profile_customer_name_product_code_key"
    ON "customer_product_profile"("customer_name", "product_code");
