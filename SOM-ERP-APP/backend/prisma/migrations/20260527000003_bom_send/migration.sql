-- CreateTable: bom_send
CREATE TABLE IF NOT EXISTS "bom_send" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "send_id"      TEXT NOT NULL UNIQUE,
  "indent_id"    TEXT,
  "plan_id"      TEXT NOT NULL,
  "product_code" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "batch_no"     TEXT NOT NULL,
  "di_no"        TEXT NOT NULL,
  "section_type" TEXT,
  "bom_type"     TEXT NOT NULL,
  "total_qty"    REAL NOT NULL,
  "uom"          TEXT NOT NULL DEFAULT 'KG',
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "remarks"      TEXT,
  "sent_by"      TEXT,
  "sent_at"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "picked_at"    DATETIME,
  "issued_at"    DATETIME
);
