-- =============================================================================
-- SOM ERP — FULL MIGRATION v3.0
-- Run AFTER existing Prisma schema is applied.
-- All new ERP module tables. Does NOT touch existing tables.
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS & AUTH
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(100) UNIQUE NOT NULL,
  email         VARCHAR(200) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(200) NOT NULL,
  phone         VARCHAR(20),
  pin_hash      VARCHAR(255),
  role          VARCHAR(50) NOT NULL,
  -- gate_staff | store_person | store_manager | planner | planning_manager
  -- plant_supervisor | qc_person | sales_team | admin
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- =============================================================================
-- AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  username      VARCHAR(100),
  action        VARCHAR(50) NOT NULL,
  table_name    VARCHAR(100),
  record_id     VARCHAR(200),
  old_value     JSONB,
  new_value     JSONB,
  ip_address    VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table    ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_ts       ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_log(action);

-- =============================================================================
-- REASON CODES
-- =============================================================================

CREATE TABLE IF NOT EXISTS reason_codes (
  code_id   SERIAL PRIMARY KEY,
  category  VARCHAR(100) NOT NULL,
  code      VARCHAR(50)  NOT NULL,
  label     VARCHAR(200) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(category, code)
);

-- =============================================================================
-- MASTER DATA — SUPPLIERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_suppliers (
  supplier_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name VARCHAR(200) NOT NULL,
  gstin         VARCHAR(20),
  phone         VARCHAR(20),
  email         VARCHAR(200),
  address       TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MASTER DATA — PLANTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_plants (
  plant_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_name  VARCHAR(200) NOT NULL,
  plant_code  VARCHAR(20) UNIQUE NOT NULL,
  location    VARCHAR(200),
  plant_type  VARCHAR(50) NOT NULL, -- formulation / packing / both
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MASTER DATA — EQUIPMENT (ERP EXTENDED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_equipment (
  equipment_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id                UUID REFERENCES erp_plants(plant_id),
  equipment_name          VARCHAR(200) NOT NULL,
  equipment_code          VARCHAR(50) UNIQUE NOT NULL,
  equipment_type          VARCHAR(100) NOT NULL,
  working_volume          DECIMAL(12,3),
  working_volume_unit     VARCHAR(20) DEFAULT 'KG',
  cleaning_time_hrs       DECIMAL(5,2) DEFAULT 0,
  requires_sterilisation  BOOLEAN DEFAULT FALSE,
  status                  VARCHAR(30) DEFAULT 'active',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_erp_equip_plant  ON erp_equipment(plant_id);
CREATE INDEX IF NOT EXISTS idx_erp_equip_status ON erp_equipment(status);

-- =============================================================================
-- MASTER DATA — MICROBIAL STRAINS
-- =============================================================================

CREATE TABLE IF NOT EXISTS microbial_strains (
  strain_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_name          VARCHAR(200) NOT NULL,
  decay_k              DECIMAL(10,6) NOT NULL DEFAULT 0.01,
  optimal_temp_c       DECIMAL(5,2),
  min_viable_cfu_per_ml DECIMAL(15,2),
  notes                TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MASTER DATA — ITEMS (ERP EXTENDED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_items (
  item_code               VARCHAR(50) PRIMARY KEY,
  item_name               VARCHAR(300) NOT NULL,
  item_category           VARCHAR(30) NOT NULL, -- RM / PM / FG / consumable
  uom                     VARCHAR(20) NOT NULL,
  warehouse_zone          VARCHAR(100),
  reorder_level           DECIMAL(12,3) DEFAULT 0,
  decanting_tolerance_pct DECIMAL(5,2) DEFAULT 0.5,
  is_microbial            BOOLEAN DEFAULT FALSE,
  supplier_default        UUID REFERENCES erp_suppliers(supplier_id),
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_erp_items_cat ON erp_items(item_category);

-- =============================================================================
-- MASTER DATA — CUSTOMERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
  customer_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(300) NOT NULL,
  customer_code VARCHAR(50) UNIQUE,
  gstin         VARCHAR(20),
  address       TEXT,
  state         VARCHAR(100),
  phone         VARCHAR(20),
  email         VARCHAR(200),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MASTER DATA — PRODUCTS (ERP EXTENDED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_products (
  product_code                VARCHAR(50) PRIMARY KEY,
  product_name                VARCHAR(300) NOT NULL,
  product_category            VARCHAR(100),
  plant_id                    UUID REFERENCES erp_plants(plant_id),
  alternate_plant_id          UUID REFERENCES erp_plants(plant_id),
  alt_plant_requires_approval BOOLEAN DEFAULT FALSE,
  formulation_type            VARCHAR(100),
  shelf_life_days             INTEGER,
  consolidation_window_days   INTEGER DEFAULT 3,
  is_microbial                BOOLEAN DEFAULT FALSE,
  microbial_strain_id         UUID REFERENCES microbial_strains(strain_id),
  status                      VARCHAR(20) DEFAULT 'active',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_erp_products_status ON erp_products(status);

-- =============================================================================
-- BOM HEADERS (VERSIONED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bom_headers (
  bom_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code   VARCHAR(50) REFERENCES erp_products(product_code),
  bom_version    VARCHAR(20) NOT NULL,
  effective_date DATE NOT NULL,
  approved_by    UUID REFERENCES users(user_id),
  status         VARCHAR(20) DEFAULT 'active',
  yield_pct      DECIMAL(5,2) DEFAULT 98.00,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_code, bom_version)
);
CREATE INDEX IF NOT EXISTS idx_bom_product ON bom_headers(product_code);
CREATE INDEX IF NOT EXISTS idx_bom_status  ON bom_headers(status);

-- =============================================================================
-- BOM LINES — FORMULATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS bom_lines_formulation (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id       UUID REFERENCES bom_headers(bom_id) ON DELETE CASCADE,
  item_code    VARCHAR(50) REFERENCES erp_items(item_code),
  qty_per_unit DECIMAL(14,6) NOT NULL,
  unit         VARCHAR(20) NOT NULL,
  is_critical  BOOLEAN DEFAULT FALSE,
  seq_no       INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_bom_form_bom  ON bom_lines_formulation(bom_id);

-- =============================================================================
-- BOM LINES — PACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS bom_lines_packing (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id       UUID REFERENCES bom_headers(bom_id) ON DELETE CASCADE,
  item_code    VARCHAR(50) REFERENCES erp_items(item_code),
  qty_per_unit DECIMAL(14,6) NOT NULL,
  unit         VARCHAR(20) NOT NULL,
  seq_no       INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_bom_pack_bom ON bom_lines_packing(bom_id);

-- =============================================================================
-- GATE — LOT SEQUENCES (per item per year)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gate_lot_sequences (
  item_code VARCHAR(50),
  year      INTEGER,
  seq       INTEGER DEFAULT 0,
  PRIMARY KEY (item_code, year)
);

-- =============================================================================
-- GATE INWARD
-- =============================================================================

CREATE TABLE IF NOT EXISTS gate_inward (
  inward_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name VARCHAR(300) NOT NULL,
  invoice_no    VARCHAR(100),
  total_qty     DECIMAL(12,3) NOT NULL,
  uom           VARCHAR(20) NOT NULL,
  vehicle_no    VARCHAR(50),
  entry_time    TIMESTAMPTZ DEFAULT NOW(),
  item_code     VARCHAR(50),
  item_name     VARCHAR(300),
  lot_number    VARCHAR(200),
  num_packs     INTEGER DEFAULT 1,
  unit_price    DECIMAL(12,4),
  status        VARCHAR(50) DEFAULT 'pending_review',
  -- pending_review / labels_generated / qr_pending / confirmed / quarantine
  created_by    UUID REFERENCES users(user_id),
  confirmed_by  UUID REFERENCES users(user_id),
  confirmed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gi_status   ON gate_inward(status);
CREATE INDEX IF NOT EXISTS idx_gi_item     ON gate_inward(item_code);
CREATE INDEX IF NOT EXISTS idx_gi_lot      ON gate_inward(lot_number);
CREATE INDEX IF NOT EXISTS idx_gi_entry    ON gate_inward(entry_time DESC);

-- =============================================================================
-- ERP PACKS (one per physical pack/bag)
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_packs (
  pack_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_id            UUID REFERENCES gate_inward(inward_id),
  lot_number           VARCHAR(200) NOT NULL,
  pack_seq             INTEGER NOT NULL,
  item_code            VARCHAR(50) REFERENCES erp_items(item_code),
  supplier_name        VARCHAR(300),
  invoice_number       VARCHAR(100),
  qty_received         DECIMAL(12,3) NOT NULL,
  qty_remaining        DECIMAL(12,3) NOT NULL,
  unit                 VARCHAR(20) NOT NULL,
  inward_date          DATE DEFAULT CURRENT_DATE,
  qr_confirmed         BOOLEAN DEFAULT FALSE,
  qr_confirmed_at      TIMESTAMPTZ,
  qr_confirmed_by      UUID REFERENCES users(user_id),
  verify_scan_required BOOLEAN DEFAULT FALSE,
  verify_scan_done     BOOLEAN DEFAULT FALSE,
  verified_by          UUID REFERENCES users(user_id),
  location             VARCHAR(200),
  status               VARCHAR(30) DEFAULT 'quarantine',
  -- quarantine / active / partial / exhausted / adjusted
  unit_price           DECIMAL(12,4),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lot_number, pack_seq)
);
CREATE INDEX IF NOT EXISTS idx_packs_item    ON erp_packs(item_code);
CREATE INDEX IF NOT EXISTS idx_packs_status  ON erp_packs(status);
CREATE INDEX IF NOT EXISTS idx_packs_lot     ON erp_packs(lot_number);
CREATE INDEX IF NOT EXISTS idx_packs_inward  ON erp_packs(inward_id);
CREATE INDEX IF NOT EXISTS idx_packs_qr      ON erp_packs(qr_confirmed);
CREATE INDEX IF NOT EXISTS idx_packs_indate  ON erp_packs(inward_date);

-- =============================================================================
-- GATE OUTWARD
-- =============================================================================

CREATE TABLE IF NOT EXISTS gate_outward (
  outward_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name        VARCHAR(300),
  qty              DECIMAL(12,3),
  uom              VARCHAR(20),
  destination      VARCHAR(300),
  vehicle_no       VARCHAR(50),
  authorized_by    VARCHAR(200),
  entry_time       TIMESTAMPTZ DEFAULT NOW(),
  is_unauthorised  BOOLEAN DEFAULT FALSE,
  system_ref_type  VARCHAR(50),
  system_ref_id    UUID,
  created_by       UUID REFERENCES users(user_id),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_go_unauth ON gate_outward(is_unauthorised);
CREATE INDEX IF NOT EXISTS idx_go_time   ON gate_outward(entry_time DESC);

-- =============================================================================
-- STOCK ADJUSTMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS stock_adjustments (
  adjustment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id       UUID REFERENCES erp_packs(pack_id),
  item_code     VARCHAR(50),
  reason_code   VARCHAR(50) NOT NULL,
  qty_before    DECIMAL(12,3) NOT NULL,
  qty_after     DECIMAL(12,3) NOT NULL,
  delta         DECIMAL(12,3) NOT NULL,
  raised_by     UUID REFERENCES users(user_id),
  approved_by   UUID REFERENCES users(user_id),
  raised_at     TIMESTAMPTZ DEFAULT NOW(),
  approved_at   TIMESTAMPTZ,
  status        VARCHAR(30) DEFAULT 'pending',
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_adj_status ON stock_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_adj_pack   ON stock_adjustments(pack_id);

-- =============================================================================
-- WAREHOUSE TRANSFERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS warehouse_transfers (
  transfer_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id       UUID REFERENCES erp_packs(pack_id),
  transfer_type VARCHAR(30) NOT NULL,
  from_location VARCHAR(200),
  to_location   VARCHAR(200),
  from_plant_id UUID REFERENCES erp_plants(plant_id),
  to_plant_id   UUID REFERENCES erp_plants(plant_id),
  initiated_by  UUID REFERENCES users(user_id),
  received_by   UUID REFERENCES users(user_id),
  status        VARCHAR(30) DEFAULT 'pending',
  initiated_at  TIMESTAMPTZ DEFAULT NOW(),
  received_at   TIMESTAMPTZ,
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_wt_pack   ON warehouse_transfers(pack_id);
CREATE INDEX IF NOT EXISTS idx_wt_status ON warehouse_transfers(status);

-- =============================================================================
-- FIFO OVERRIDE LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS fifo_override_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID,
  item_code    VARCHAR(50),
  older_lot    VARCHAR(200),
  older_qty    DECIMAL(12,3),
  selected_lot VARCHAR(200),
  override_by  UUID REFERENCES users(user_id),
  reason       TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fifo_job  ON fifo_override_log(job_id);
CREATE INDEX IF NOT EXISTS idx_fifo_item ON fifo_override_log(item_code);

-- =============================================================================
-- CONTAINERS (FOR DECANTING)
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_containers (
  container_id        VARCHAR(100) PRIMARY KEY,
  container_qr        VARCHAR(200) UNIQUE,
  item_code           VARCHAR(50) REFERENCES erp_items(item_code),
  location            VARCHAR(200),
  max_capacity        DECIMAL(12,3) NOT NULL,
  current_qty         DECIMAL(12,3) DEFAULT 0,
  uom                 VARCHAR(20),
  low_stock_threshold DECIMAL(12,3) DEFAULT 0,
  last_replenished_at TIMESTAMPTZ,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_containers_item ON erp_containers(item_code);

-- =============================================================================
-- DECANTING LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS decanting_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pack_id   UUID REFERENCES erp_packs(pack_id),
  target_container VARCHAR(100) REFERENCES erp_containers(container_id),
  qty_entered      DECIMAL(12,3) NOT NULL,
  qty_actual       DECIMAL(12,3),
  variance_pct     DECIMAL(7,4),
  tolerance_pct    DECIMAL(5,2),
  needs_approval   BOOLEAN DEFAULT FALSE,
  approved_by      UUID REFERENCES users(user_id),
  approved_at      TIMESTAMPTZ,
  performed_by     UUID REFERENCES users(user_id),
  status           VARCHAR(30) DEFAULT 'completed',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decant_pack ON decanting_log(source_pack_id);

-- =============================================================================
-- SALES ORDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS sales_orders (
  di_number           VARCHAR(100) PRIMARY KEY,
  company             VARCHAR(200),
  order_type          VARCHAR(30) NOT NULL DEFAULT 'Domestic',
  status              VARCHAR(30) DEFAULT 'new',
  customer_name       VARCHAR(300),
  order_date          DATE,
  etd                 DATE,
  product_code        VARCHAR(50),
  product_name        VARCHAR(300),
  order_qty           DECIMAL(14,3),
  qty_unit            VARCHAR(10) DEFAULT 'kg',
  active_ingredient   VARCHAR(200),
  specifications      VARCHAR(200),
  carrier             VARCHAR(200),
  per_unit_qty_pp     DECIMAL(10,3),
  primary_pack_type   VARCHAR(200),
  secondary_pack_type VARCHAR(50),
  label_type          VARCHAR(200),
  priority            VARCHAR(20) DEFAULT 'Normal',
  sales_staff         VARCHAR(200),
  notes               TEXT,
  total_units_fp      INTEGER,
  excel_synced_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_so_status  ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_etd     ON sales_orders(etd);
CREATE INDEX IF NOT EXISTS idx_so_product ON sales_orders(product_code);
CREATE INDEX IF NOT EXISTS idx_so_prio    ON sales_orders(priority);

-- Function to auto-compute total_units_fp
CREATE OR REPLACE FUNCTION so_compute_units()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.per_unit_qty_pp IS NOT NULL AND NEW.per_unit_qty_pp > 0 AND NEW.order_qty IS NOT NULL THEN
    NEW.total_units_fp := ROUND(NEW.order_qty / NEW.per_unit_qty_pp)::INTEGER;
  ELSE
    NEW.total_units_fp := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_so_units
  BEFORE INSERT OR UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION so_compute_units();

-- =============================================================================
-- ORDER DISPATCH
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_dispatch (
  dispatch_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  di_number      VARCHAR(100) REFERENCES sales_orders(di_number),
  invoice_number VARCHAR(100),
  invoice_date   DATE,
  transport_name VARCHAR(200),
  dispatched_by  UUID REFERENCES users(user_id),
  dispatch_date  DATE,
  dispatch_notes TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_di ON order_dispatch(di_number);

-- =============================================================================
-- PRODUCTION PLANS
-- =============================================================================

CREATE TABLE IF NOT EXISTS production_plans (
  plan_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  di_number            VARCHAR(100) REFERENCES sales_orders(di_number),
  product_code         VARCHAR(50) REFERENCES erp_products(product_code),
  bom_id               UUID REFERENCES bom_headers(bom_id),
  bom_version          VARCHAR(20),
  planned_qty          DECIMAL(14,3) NOT NULL,
  equipment_id         UUID REFERENCES erp_equipment(equipment_id),
  batch_count          INTEGER NOT NULL DEFAULT 1,
  planned_start_date   DATE,
  planned_end_date     DATE,
  status               VARCHAR(30) DEFAULT 'draft',
  is_urgent            BOOLEAN DEFAULT FALSE,
  urgent_reason        TEXT,
  consolidation_group  VARCHAR(100),
  fg_stock_used        DECIMAL(14,3) DEFAULT 0,
  created_by           UUID REFERENCES users(user_id),
  submitted_by         UUID REFERENCES users(user_id),
  approved_by          UUID REFERENCES users(user_id),
  published_by         UUID REFERENCES users(user_id),
  submitted_at         TIMESTAMPTZ,
  approved_at          TIMESTAMPTZ,
  published_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_status  ON production_plans(status);
CREATE INDEX IF NOT EXISTS idx_plan_product ON production_plans(product_code);
CREATE INDEX IF NOT EXISTS idx_plan_di      ON production_plans(di_number);

-- =============================================================================
-- PRODUCTION JOBS (ONE PER BATCH)
-- =============================================================================

CREATE TABLE IF NOT EXISTS production_jobs (
  job_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id              UUID REFERENCES production_plans(plan_id),
  batch_no             INTEGER NOT NULL,
  batch_code           VARCHAR(100),
  product_code         VARCHAR(50) REFERENCES erp_products(product_code),
  equipment_id         UUID REFERENCES erp_equipment(equipment_id),
  batch_qty            DECIMAL(14,3) NOT NULL,
  expected_start_time  TIMESTAMPTZ,
  expected_end_time    TIMESTAMPTZ,
  actual_start_time    TIMESTAMPTZ,
  actual_end_time      TIMESTAMPTZ,
  status               VARCHAR(30) DEFAULT 'pending',
  delay_reason_code    VARCHAR(50),
  delay_notes          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_plan   ON production_jobs(plan_id);
CREATE INDEX IF NOT EXISTS idx_job_status ON production_jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_equip  ON production_jobs(equipment_id);

-- =============================================================================
-- JOB EQUIPMENT ASSIGNMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_equipment_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID REFERENCES production_jobs(job_id),
  equipment_id UUID REFERENCES erp_equipment(equipment_id),
  start_time   TIMESTAMPTZ,
  end_time     TIMESTAMPTZ
);

-- =============================================================================
-- BOM ISSUANCE (STORE → PRODUCTION)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bom_issuance (
  issuance_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID REFERENCES production_jobs(job_id),
  item_code     VARCHAR(50) REFERENCES erp_items(item_code),
  pack_id       UUID REFERENCES erp_packs(pack_id),
  required_qty  DECIMAL(12,6) NOT NULL,
  issued_qty    DECIMAL(12,6) NOT NULL,
  issued_by     UUID REFERENCES users(user_id),
  issued_at     TIMESTAMPTZ DEFAULT NOW(),
  fifo_override BOOLEAN DEFAULT FALSE,
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_issuance_job  ON bom_issuance(job_id);
CREATE INDEX IF NOT EXISTS idx_issuance_pack ON bom_issuance(pack_id);
CREATE INDEX IF NOT EXISTS idx_issuance_item ON bom_issuance(item_code);

-- =============================================================================
-- BATCH QC RECORDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS batch_qc_records (
  qc_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID REFERENCES production_jobs(job_id),
  qc_person_id UUID REFERENCES users(user_id),
  result       VARCHAR(20) NOT NULL,
  cfu_count    DECIMAL(15,2),
  moisture_pct DECIMAL(5,2),
  ph_value     DECIMAL(5,2),
  notes        TEXT,
  action_taken VARCHAR(30),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qc_job ON batch_qc_records(job_id);

-- =============================================================================
-- PRODUCTION LOSS LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS production_loss_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID REFERENCES production_jobs(job_id),
  item_code   VARCHAR(50),
  qty_lost    DECIMAL(12,3) NOT NULL,
  reason_code VARCHAR(50),
  notes       TEXT,
  logged_by   UUID REFERENCES users(user_id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MICROBIAL CONTAINERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS microbial_containers (
  container_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_id         UUID REFERENCES microbial_strains(strain_id),
  location_room     VARCHAR(200),
  location_position VARCHAR(100),
  volume_litres     DECIMAL(10,3) NOT NULL,
  mfg_cfu_per_ml    DECIMAL(15,2) NOT NULL,
  mfg_date          DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  storage_temp_c    DECIMAL(5,2),
  status            VARCHAR(20) DEFAULT 'healthy',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mc_strain ON microbial_containers(strain_id);
CREATE INDEX IF NOT EXISTS idx_mc_status ON microbial_containers(status);
CREATE INDEX IF NOT EXISTS idx_mc_expiry ON microbial_containers(expiry_date);

-- =============================================================================
-- MICROBIAL TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS microbial_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id          UUID REFERENCES microbial_containers(container_id),
  job_id                UUID REFERENCES production_jobs(job_id),
  volume_dispatched_l   DECIMAL(10,3) NOT NULL,
  cfu_per_ml_at_dispatch DECIMAL(15,2),
  dispatch_temp_c       DECIMAL(5,2),
  dispatched_by         UUID REFERENCES users(user_id),
  receiver_name         VARCHAR(200),
  dispatch_date         TIMESTAMPTZ DEFAULT NOW(),
  receipt_confirmed     BOOLEAN DEFAULT FALSE,
  receipt_confirmed_at  TIMESTAMPTZ,
  receipt_notes         TEXT,
  actual_cfu_on_receipt DECIMAL(15,2)
);
CREATE INDEX IF NOT EXISTS idx_mt_container ON microbial_transactions(container_id);
CREATE INDEX IF NOT EXISTS idx_mt_receipt   ON microbial_transactions(receipt_confirmed, dispatch_date);

-- =============================================================================
-- TIME MOTION LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS time_motion_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code     VARCHAR(50),
  equipment_id     UUID REFERENCES erp_equipment(equipment_id),
  operation_stage  VARCHAR(50) NOT NULL,
  qty_produced     DECIMAL(12,3) NOT NULL,
  time_hrs         DECIMAL(8,3) NOT NULL,
  workers_deployed INTEGER,
  shift            VARCHAR(20),
  supervisor_id    UUID REFERENCES users(user_id),
  notes            TEXT,
  mins_per_unit    DECIMAL(10,4),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tml_product ON time_motion_logs(product_code, equipment_id);

-- Auto-compute mins_per_unit on insert/update
CREATE OR REPLACE FUNCTION tml_compute_mpu()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.qty_produced > 0 THEN
    NEW.mins_per_unit := (NEW.time_hrs * 60.0) / NEW.qty_produced;
  ELSE
    NEW.mins_per_unit := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tml_mpu
  BEFORE INSERT OR UPDATE ON time_motion_logs
  FOR EACH ROW EXECUTE FUNCTION tml_compute_mpu();

-- =============================================================================
-- TIME MOTION MODEL — MATERIALISED VIEW
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS time_motion_model AS
SELECT
  product_code,
  equipment_id,
  operation_stage,
  ROUND(AVG(mins_per_unit)::NUMERIC, 4)        AS avg_mins_per_unit,
  ROUND(AVG(workers_deployed)::NUMERIC, 1)     AS avg_workers,
  COUNT(*)                                     AS observation_count,
  CASE
    WHEN COUNT(*) <  3 THEN 'low'
    WHEN COUNT(*) < 10 THEN 'medium'
    ELSE                    'high'
  END                                          AS confidence
FROM time_motion_logs
WHERE mins_per_unit IS NOT NULL
GROUP BY product_code, equipment_id, operation_stage;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tmm_unique ON time_motion_model(product_code, equipment_id, operation_stage);

-- Function to refresh the view on every new log
CREATE OR REPLACE FUNCTION refresh_time_motion_model()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY time_motion_model;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refresh_tmm
  AFTER INSERT OR UPDATE ON time_motion_logs
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_time_motion_model();

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  notif_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notif_type     VARCHAR(100) NOT NULL,
  title          VARCHAR(300) NOT NULL,
  message        TEXT NOT NULL,
  target_role    VARCHAR(50),
  target_user_id UUID REFERENCES users(user_id),
  ref_type       VARCHAR(50),
  ref_id         VARCHAR(200),
  is_read        BOOLEAN DEFAULT FALSE,
  is_actioned    BOOLEAN DEFAULT FALSE,
  actioned_at    TIMESTAMPTZ,
  actioned_by    UUID REFERENCES users(user_id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user    ON notifications(target_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_type    ON notifications(notif_type, is_actioned);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

-- =============================================================================
-- NOTIFICATION ESCALATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_escalations (
  id           BIGSERIAL PRIMARY KEY,
  notif_id     UUID REFERENCES notifications(notif_id),
  level        INTEGER NOT NULL,
  escalated_to UUID REFERENCES users(user_id),
  escalated_at TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT
);
CREATE INDEX IF NOT EXISTS idx_nesc_notif ON notification_escalations(notif_id);

-- =============================================================================
-- NOTIFICATION DELIVERY LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id            BIGSERIAL PRIMARY KEY,
  notif_id      UUID REFERENCES notifications(notif_id),
  channel       VARCHAR(30) NOT NULL,
  status        VARCHAR(20) DEFAULT 'sent',
  external_id   VARCHAR(200),
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_ndl_notif ON notification_delivery_log(notif_id);

-- =============================================================================
-- HELPER: updated_at auto-update
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','erp_suppliers','erp_items','erp_equipment','erp_products',
    'gate_inward','erp_packs','erp_containers','production_plans',
    'production_jobs'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at_%1$s BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- =============================================================================
-- DONE
-- =============================================================================
