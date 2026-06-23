-- ============================================================
-- BMR MODULE — MIGRATION SQL
-- Paste this entire file into Neon SQL Editor and Run All
-- ============================================================

-- ── 1. BMR RECORD (master record, one per production plan) ──────────────────
CREATE TABLE IF NOT EXISTS bmr_record (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plan_id          TEXT NOT NULL,
  batch_code       TEXT NOT NULL DEFAULT '',
  product_code     TEXT NOT NULL DEFAULT '',
  product_name     TEXT NOT NULL,
  di_no            TEXT NOT NULL,
  section          TEXT NOT NULL,
  bmr_status       TEXT NOT NULL DEFAULT 'NOT_STARTED',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. SECTION A — Batch Header + Environment ───────────────────────────────
CREATE TABLE IF NOT EXISTS bmr_section_a (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bmr_id                TEXT NOT NULL UNIQUE REFERENCES bmr_record(id) ON DELETE CASCADE,
  batch_date            DATE,
  temperature           DOUBLE PRECISION,
  temp_unit             TEXT DEFAULT 'C',
  humidity              DOUBLE PRECISION,
  weather               TEXT,
  cfu_count_ordered     TEXT,
  cleaning_status       TEXT,
  cleaning_photo_url    TEXT,
  cleaning_start_time   TEXT,
  cleaning_end_time     TEXT,
  cleaning_end_photo_url TEXT,
  saved_at              TIMESTAMPTZ,
  saved_by              TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. SECTION B — Technical / Microbial Culture ────────────────────────────
CREATE TABLE IF NOT EXISTS bmr_section_b (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bmr_id                 TEXT NOT NULL UNIQUE REFERENCES bmr_record(id) ON DELETE CASCADE,
  microbes_present       BOOLEAN,
  microbe_types          TEXT[],
  no_of_microbes_received INTEGER,
  form_of_culture        TEXT,
  microbes_received_from TEXT,
  mcr_or_ssf             TEXT,
  fungal_culture         BOOLEAN,
  koji_or_harvested      TEXT,
  microbes_received_on   DATE,
  microbes_received_time TEXT,
  total_qty_received     DOUBLE PRECISION,
  no_of_bags             INTEGER,
  biomass_qty            DOUBLE PRECISION,
  initial_moisture       DOUBLE PRECISION,
  tech_start_time        TEXT,
  tech_end_time          TEXT,
  co_formulants_qty      DOUBLE PRECISION,
  tech_workers           INTEGER,
  total_tech_qty         DOUBLE PRECISION,
  qty_after_sieving      DOUBLE PRECISION,
  sieving                BOOLEAN,
  sieving_start_time     TEXT,
  sieving_end_time       TEXT,
  mesh_size              TEXT,
  incharge_name          TEXT,
  sample_collected       BOOLEAN,
  sample_process         TEXT,
  sample_id              TEXT,
  sample_submitted_on    DATE,
  saved_at               TIMESTAMPTZ,
  saved_by               TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. CULTURE DETAIL ROWS (child of Section B, up to 6 rows) ───────────────
CREATE TABLE IF NOT EXISTS bmr_culture_detail (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  section_b_id   TEXT NOT NULL REFERENCES bmr_section_b(id) ON DELETE CASCADE,
  culture_name   TEXT,
  batch_no       TEXT,
  doi_or_doh     DATE,
  cfu_per_g      DOUBLE PRECISION,
  qty            DOUBLE PRECISION,
  row_order      INTEGER NOT NULL DEFAULT 0
);

-- ── 5. SECTION C — Formulation ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bmr_section_c (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bmr_id                  TEXT NOT NULL UNIQUE REFERENCES bmr_record(id) ON DELETE CASCADE,
  sfg_used                BOOLEAN,
  sfg_di_no               TEXT,
  sfg_dof                 DATE,
  sfg_qty_used            DOUBLE PRECISION,
  carrier                 TEXT,
  male_workers            INTEGER,
  female_workers          INTEGER,
  equipment               TEXT,
  total_qty               DOUBLE PRECISION,
  rm_charging_start_time  TEXT,
  rm_charging_end_time    TEXT,
  blending_start_time     TEXT,
  blending_end_time       TEXT,
  unloading_start_time    TEXT,
  unloading_end_time      TEXT,
  weight_after_unloading  DOUBLE PRECISION,
  sieving                 BOOLEAN,
  sieving_start_time      TEXT,
  sieving_end_time        TEXT,
  mesh_size               TEXT,
  weight_after_sieving    DOUBLE PRECISION,
  incharge_name           TEXT,
  sample_collected        BOOLEAN,
  sample_process          TEXT,
  sample_id               TEXT,
  sample_submitted_on     DATE,
  saved_at                TIMESTAMPTZ,
  saved_by                TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. RM CHECKLIST ITEMS (child of Section C, auto-populated from BOM) ──────
CREATE TABLE IF NOT EXISTS bmr_rm_checklist_item (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  section_c_id TEXT NOT NULL REFERENCES bmr_section_c(id) ON DELETE CASCADE,
  rm_code      TEXT NOT NULL,
  rm_name      TEXT NOT NULL,
  std_qty      DOUBLE PRECISION NOT NULL,
  uom          TEXT NOT NULL,
  added        BOOLEAN NOT NULL DEFAULT FALSE,
  time_added   TIMESTAMPTZ,
  remarks      TEXT,
  row_order    INTEGER NOT NULL DEFAULT 0
);

-- ── 7. SECTION D — Packing ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bmr_section_d (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bmr_id                TEXT NOT NULL UNIQUE REFERENCES bmr_record(id) ON DELETE CASCADE,
  date_of_packing       DATE,
  date_of_formulation   DATE,
  qty_received          DOUBLE PRECISION,
  male_workers          INTEGER,
  female_workers        INTEGER,
  type_of_packing       TEXT,
  primary_pack          TEXT,
  secondary_pack        TEXT,
  weight_per_unit       DOUBLE PRECISION,
  total_qty_packed      DOUBLE PRECISION,
  total_units_packed    INTEGER,
  units_per_cbb         INTEGER,
  total_outer_packages  INTEGER,
  label_type            TEXT,
  labelling_start_time  TEXT,
  labelling_end_time    TEXT,
  stretch_film          BOOLEAN,
  sf_start_time         TEXT,
  sf_end_time           TEXT,
  carry_strapping       BOOLEAN,
  cs_start_time         TEXT,
  cs_end_time           TEXT,
  qty_leftover          DOUBLE PRECISION,
  leftover_stored_at    TEXT,
  sfg_updated           BOOLEAN,
  sample_collected      BOOLEAN,
  sample_process        TEXT,
  sample_id             TEXT,
  sample_submitted_on   DATE,
  sent_to_inventory_on  DATE,
  handed_over_to        TEXT,
  total_units_sent      INTEGER,
  sent_time             TEXT,
  incharge_name         TEXT,
  saved_at              TIMESTAMPTZ,
  saved_by              TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. SECTION E — COA (QC team only) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bmr_section_e (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bmr_id            TEXT NOT NULL UNIQUE REFERENCES bmr_record(id) ON DELETE CASCADE,
  coa_no            TEXT,
  carrier           TEXT,
  sent_on           DATE,
  sent_by           TEXT,
  section           TEXT,
  composition       TEXT,
  date_of_analysis  DATE,
  analyst_name      TEXT,
  analyzed_by       TEXT,
  analyzed_by_dept  TEXT,
  analyzed_by_date  DATE,
  checked_by        TEXT,
  checked_by_dept   TEXT,
  checked_by_date   DATE,
  approved_by       TEXT,
  approved_by_dept  TEXT,
  approved_by_date  DATE,
  coa_status        TEXT NOT NULL DEFAULT 'PENDING',
  saved_at          TIMESTAMPTZ,
  saved_by          TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. COA PARAMETERS (child of Section E) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bmr_coa_parameter (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  section_e_id   TEXT NOT NULL REFERENCES bmr_section_e(id) ON DELETE CASCADE,
  param_name     TEXT NOT NULL,
  specification  TEXT,
  result         TEXT,
  param_status   TEXT,
  row_order      INTEGER NOT NULL DEFAULT 0,
  is_sub_row     BOOLEAN NOT NULL DEFAULT FALSE,
  parent_param   TEXT
);

-- ── 10. DEVIATIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bmr_deviation (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bmr_id          TEXT NOT NULL REFERENCES bmr_record(id) ON DELETE CASCADE,
  section         TEXT NOT NULL,
  details         TEXT NOT NULL,
  supervisor_name TEXT,
  notified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_by     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 11. SAMPLES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bmr_sample (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bmr_id            TEXT NOT NULL REFERENCES bmr_record(id) ON DELETE CASCADE,
  sample_id         TEXT NOT NULL UNIQUE,
  section           TEXT NOT NULL,
  process           TEXT,
  collected_on      DATE,
  submitted_on      DATE,
  composition       TEXT,
  sample_status     TEXT NOT NULL DEFAULT 'COLLECTED',
  sent_to_qc_at     TIMESTAMPTZ,
  received_in_qc_at TIMESTAMPTZ,
  verified_at       TIMESTAMPTZ,
  verified_by       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 12. ANALYTICS EVENTS (silent background capture) ────────────────────────
CREATE TABLE IF NOT EXISTS bmr_analytics_event (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bmr_id       TEXT REFERENCES bmr_record(id) ON DELETE SET NULL,
  bom_id       TEXT,
  plan_id      TEXT,
  event_type   TEXT NOT NULL,
  payload      JSONB,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 13. NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT,
  role        TEXT,
  section     TEXT,
  notif_type  TEXT NOT NULL DEFAULT 'IN_APP',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

-- ── 14. ALTER bom_send — add Issue to Section + Acknowledgment columns ────────
ALTER TABLE bom_send
  ADD COLUMN IF NOT EXISTS issued_to_section_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by       TEXT;

-- ── 15. INDEXES for performance ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bmr_record_plan_id    ON bmr_record(plan_id);
CREATE INDEX IF NOT EXISTS idx_bmr_record_section    ON bmr_record(section);
CREATE INDEX IF NOT EXISTS idx_bmr_record_status     ON bmr_record(bmr_status);
CREATE INDEX IF NOT EXISTS idx_bmr_analytics_plan    ON bmr_analytics_event(plan_id);
CREATE INDEX IF NOT EXISTS idx_notification_user     ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_role     ON notification(role);
CREATE INDEX IF NOT EXISTS idx_notification_read     ON notification(read);
CREATE INDEX IF NOT EXISTS idx_rmchecklist_section_c ON bmr_rm_checklist_item(section_c_id);
CREATE INDEX IF NOT EXISTS idx_culture_detail_b      ON bmr_culture_detail(section_b_id);
CREATE INDEX IF NOT EXISTS idx_coa_param_e           ON bmr_coa_parameter(section_e_id);

-- ============================================================
-- DONE — 13 new tables + 3 columns added to bom_send
-- ============================================================
