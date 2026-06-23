-- =============================================================================
-- SOM ERP — SEED DATA
-- Run AFTER erp-migration.sql
-- =============================================================================

-- ─── REASON CODES ─────────────────────────────────────────────────────────────

INSERT INTO reason_codes (category, code, label) VALUES
  -- Stock Adjustments
  ('stock_adjustment', 'PHYS_COUNT', 'Physical count variance'),
  ('stock_adjustment', 'DAMAGE',     'Damage'),
  ('stock_adjustment', 'SPILLAGE',   'Spillage'),
  ('stock_adjustment', 'EXPIRED',    'Expired'),
  ('stock_adjustment', 'OTHER',      'Other (with note)'),
  -- Delay Reasons
  ('batch_delay', 'RM_NOT_AVAIL',  'RM not available'),
  ('batch_delay', 'EQUIP_BREAK',   'Equipment breakdown'),
  ('batch_delay', 'MANPOWER',      'Manpower shortage'),
  ('batch_delay', 'PREV_DELAYED',  'Previous batch delayed'),
  ('batch_delay', 'POWER',         'Power/utility issue'),
  ('batch_delay', 'QUALITY_HOLD',  'Quality hold'),
  ('batch_delay', 'OTHER',         'Other'),
  -- Production Loss
  ('production_loss', 'QC_FAIL',    'QC failure'),
  ('production_loss', 'PROCESS_ERR','Process error'),
  ('production_loss', 'CONTAMINATION','Contamination'),
  ('production_loss', 'EQUIP_ISSUE','Equipment issue'),
  ('production_loss', 'OTHER',      'Other'),
  -- FIFO Override
  ('fifo_override', 'ITEM_SAME',   'Item identical — different supplier batch'),
  ('fifo_override', 'OLDER_QUARAN','Older lot in quarantine'),
  ('fifo_override', 'MANAGER_AUTH','Manager-authorised exception'),
  ('fifo_override', 'OTHER',       'Other (requires note)')
ON CONFLICT (category, code) DO NOTHING;

-- ─── DEFAULT ADMIN USER ────────────────────────────────────────────────────────
-- Password: Admin@2026!  (PBKDF2-SHA512, change after first login)
-- Generated hash for password "Admin@2026!":
-- In production, run: node -e "import('./src/middleware/auth.js').then(m => console.log(m.hashPassword('Admin@2026!')))"
-- For seeding we insert a known hash; replace this after deployment.

DO $$
DECLARE
  admin_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_exists FROM users WHERE username = 'admin';
  IF admin_exists = 0 THEN
    INSERT INTO users (username, password_hash, full_name, role, email, is_active)
    VALUES (
      'admin',
      -- This is a placeholder hash for 'Admin@2026!' — MUST be replaced via the admin UI
      'REPLACE_WITH_HASH_FROM_hashPassword_Admin@2026!',
      'System Administrator',
      'admin',
      'admin@somphytopharma.com',
      true
    );
    RAISE NOTICE 'Admin user created. Reset password via /api/auth/users endpoint.';
  END IF;
END $$;

-- ─── SAMPLE PLANTS ────────────────────────────────────────────────────────────

INSERT INTO erp_plants (plant_name, plant_code, location, plant_type) VALUES
  ('Formulation Plant 1', 'FP1', 'Block A, Ground Floor', 'formulation'),
  ('Packing Plant 1',     'PP1', 'Block A, First Floor',  'packing'),
  ('Formulation Plant 2', 'FP2', 'Block B, Ground Floor', 'formulation'),
  ('Combined Plant',      'CP1', 'Block C',               'both')
ON CONFLICT (plant_code) DO NOTHING;

-- ─── SAMPLE EQUIPMENT ─────────────────────────────────────────────────────────

INSERT INTO erp_equipment (plant_id, equipment_name, equipment_code, equipment_type,
  working_volume, working_volume_unit, cleaning_time_hrs, requires_sterilisation)
SELECT
  p.plant_id, eq.name, eq.code, eq.type, eq.vol, eq.vol_unit, eq.clean_hrs, eq.steril
FROM erp_plants p, (VALUES
  ('FP1', 'Blender 500L (M1)',    'BLN-M1', 'blender',   500,  'L',  2.0, false),
  ('FP1', 'Blender 1000L (M2)',   'BLN-M2', 'blender',  1000,  'L',  3.0, false),
  ('FP1', 'Reactor R1',           'RCT-R1', 'reactor',   200,  'L',  4.0, true),
  ('PP1', 'Filling Line FL1',     'FLL-FL1','filling_line',0,  'kg',  1.0, false),
  ('CP1', 'Multi-Blender MB1',    'MBL-MB1','blender',   750,  'L',  2.5, false)
) AS eq(plant_code, name, code, type, vol, vol_unit, clean_hrs, steril)
WHERE p.plant_code = eq.plant_code
ON CONFLICT (equipment_code) DO NOTHING;

-- ─── SAMPLE SUPPLIERS ─────────────────────────────────────────────────────────

INSERT INTO erp_suppliers (supplier_name, gstin, phone, email) VALUES
  ('Agri Inputs India Ltd',    '27AAACI0001A1Z5', '9800001111', 'procurement@agriinputs.in'),
  ('BioTech Carriers Pvt Ltd', '29AABCB0002B2Z6', '9800002222', 'supply@biotechcarriers.com'),
  ('Om Chemicals',             '24AAAOC0003C3Z7', '9800003333', 'sales@omchemicals.in'),
  ('Packing Solutions India',  '07AABCP0004D4Z8', '9800004444', 'orders@packingsol.com')
ON CONFLICT DO NOTHING;

-- ─── SAMPLE MICROBIAL STRAINS ─────────────────────────────────────────────────

INSERT INTO microbial_strains (strain_name, decay_k, optimal_temp_c, min_viable_cfu_per_ml, notes) VALUES
  ('Rhizobium japonicum',      0.012, 28.0, 1e8,  'Soybean nitrogen-fixer'),
  ('Azotobacter chroococcum',  0.008, 30.0, 1e8,  'Free-living N-fixer'),
  ('Trichoderma viride',       0.015, 25.0, 1e7,  'Biocontrol agent'),
  ('Bacillus subtilis KD-118', 0.005, 37.0, 1e9,  'Phosphate solubilizer'),
  ('Pseudomonas fluorescens',  0.010, 27.0, 1e8,  'Plant growth promoting'),
  ('Frateuria aurantia',       0.009, 28.5, 1e8,  'Potash mobilizer')
ON CONFLICT DO NOTHING;

-- ─── SAMPLE ITEMS ─────────────────────────────────────────────────────────────

INSERT INTO erp_items (item_code, item_name, item_category, uom, warehouse_zone,
  reorder_level, decanting_tolerance_pct, is_microbial) VALUES
  ('CIT-001', 'Citric Acid',              'RM',         'kg',  'Zone-A', 500,  0.5,  false),
  ('SIL-001', 'Silica Powder',            'RM',         'kg',  'Zone-A', 1000, 0.5,  false),
  ('CAC-001', 'Calcium Carbonate',        'RM',         'kg',  'Zone-B', 2000, 0.5,  false),
  ('SMP-001', 'Skim Milk Powder',         'RM',         'kg',  'Zone-B', 500,  0.3,  false),
  ('MGS-001', 'Magnesium Stearate',       'RM',         'kg',  'Zone-A', 200,  0.5,  false),
  ('RHZ-001', 'Rhizobium Biomass',        'RM',         'L',   'Cold-1', 100,  1.0,  true),
  ('AZO-001', 'Azotobacter Culture',      'RM',         'L',   'Cold-1', 50,   1.0,  true),
  ('BAG-001', 'HDPE Bag 500g',            'PM',         'nos', 'Zone-C', 5000, 0.0,  false),
  ('BAG-002', 'HDPE Bag 1kg',             'PM',         'nos', 'Zone-C', 5000, 0.0,  false),
  ('CBX-001', 'Master Carton 12-pack',    'PM',         'nos', 'Zone-C', 500,  0.0,  false),
  ('LBL-001', 'Product Label 500g',       'PM',         'nos', 'Zone-C', 10000,0.0,  false),
  ('LBL-002', 'Product Label 1kg',        'PM',         'nos', 'Zone-C', 10000,0.0,  false)
ON CONFLICT (item_code) DO NOTHING;

-- ─── SAMPLE PRODUCTS ──────────────────────────────────────────────────────────

INSERT INTO erp_products (product_code, product_name, product_category, formulation_type,
  shelf_life_days, consolidation_window_days, is_microbial, status)
SELECT
  v.code, v.name, v.cat, v.form_type, v.shelf, v.cons_window, v.micro, 'active'
FROM (VALUES
  ('RHZ-500G', 'Rhizobium 500g Pack',       'Biofertilizer', 'WP',   365, 3, true),
  ('AZO-1KG',  'Azotobacter 1kg Pack',      'Biofertilizer', 'WP',   365, 3, true),
  ('PSB-500G', 'Phosphate Solubilizer 500g', 'Biofertilizer', 'WP',   365, 5, true),
  ('TRIC-1KG', 'Trichoderma 1kg Pack',      'Biocontrol',    'WP',   270, 3, true),
  ('BCO-5KG',  'Bioconsortia 5kg Bulk',     'Biofertilizer', 'WP',   365, 7, true),
  ('COM-1KG',  'Compost Activator 1kg',     'Amendment',     'Granule',180,5, false)
) AS v(code, name, cat, form_type, shelf, cons_window, micro)
ON CONFLICT (product_code) DO NOTHING;

-- Link products to plants
UPDATE erp_products SET plant_id = (SELECT plant_id FROM erp_plants WHERE plant_code = 'FP1' LIMIT 1)
WHERE plant_id IS NULL AND product_code IN ('RHZ-500G','AZO-1KG','PSB-500G','TRIC-1KG');

UPDATE erp_products SET plant_id = (SELECT plant_id FROM erp_plants WHERE plant_code = 'CP1' LIMIT 1)
WHERE plant_id IS NULL AND product_code IN ('BCO-5KG','COM-1KG');

-- Link microbial products to strains
UPDATE erp_products SET microbial_strain_id = (
  SELECT strain_id FROM microbial_strains WHERE strain_name = 'Rhizobium japonicum' LIMIT 1
) WHERE product_code = 'RHZ-500G';

UPDATE erp_products SET microbial_strain_id = (
  SELECT strain_id FROM microbial_strains WHERE strain_name = 'Azotobacter chroococcum' LIMIT 1
) WHERE product_code = 'AZO-1KG';

UPDATE erp_products SET microbial_strain_id = (
  SELECT strain_id FROM microbial_strains WHERE strain_name = 'Bacillus subtilis KD-118' LIMIT 1
) WHERE product_code = 'PSB-500G';

UPDATE erp_products SET microbial_strain_id = (
  SELECT strain_id FROM microbial_strains WHERE strain_name = 'Trichoderma viride' LIMIT 1
) WHERE product_code = 'TRIC-1KG';

-- ─── SAMPLE CUSTOMERS ────────────────────────────────────────────────────────

INSERT INTO customers (customer_name, customer_code, state) VALUES
  ('Krishidhan Seeds Ltd',         'KDN-001', 'Maharashtra'),
  ('Bharat Agro Inputs',           'BAI-002', 'Gujarat'),
  ('Southern Agri Traders',        'SAT-003', 'Tamil Nadu'),
  ('North India Fertilizers',      'NIF-004', 'Punjab'),
  ('AgroTech International Ltd',   'ATI-005', 'Export')
ON CONFLICT DO NOTHING;

-- ─── SAMPLE CONTAINERS (for decanting) ────────────────────────────────────────

INSERT INTO erp_containers (container_id, container_qr, item_code, location,
  max_capacity, current_qty, uom, low_stock_threshold)
VALUES
  ('CNT-CIT-001', 'QR-CNT-CIT-001', 'CIT-001', 'Zone-A Shelf-1', 50,  0, 'kg', 10),
  ('CNT-SIL-001', 'QR-CNT-SIL-001', 'SIL-001', 'Zone-A Shelf-2', 100, 0, 'kg', 20),
  ('CNT-CAC-001', 'QR-CNT-CAC-001', 'CAC-001', 'Zone-B Shelf-1', 200, 0, 'kg', 50),
  ('CNT-SMP-001', 'QR-CNT-SMP-001', 'SMP-001', 'Zone-B Shelf-2', 50,  0, 'kg', 10),
  ('CNT-MGS-001', 'QR-CNT-MGS-001', 'MGS-001', 'Zone-A Shelf-3', 25,  0, 'kg', 5)
ON CONFLICT (container_id) DO NOTHING;

-- ─── SAMPLE MICROBIAL CONTAINERS ──────────────────────────────────────────────

INSERT INTO microbial_containers (strain_id, location_room, location_position,
  volume_litres, mfg_cfu_per_ml, mfg_date, expiry_date, storage_temp_c, status)
SELECT
  ms.strain_id, v.room, v.pos, v.vol, v.cfu, v.mfg_date::date, v.exp_date::date, v.temp, 'healthy'
FROM microbial_strains ms, (VALUES
  ('Rhizobium japonicum',      'Cold Room 1', 'Shelf A1', 50,  1e9, '2026-03-01', '2026-09-01', 4.0),
  ('Rhizobium japonicum',      'Cold Room 1', 'Shelf A2', 50,  1e9, '2026-04-01', '2026-10-01', 4.0),
  ('Azotobacter chroococcum',  'Cold Room 1', 'Shelf B1', 30,  8e8, '2026-03-15', '2026-09-15', 4.0),
  ('Trichoderma viride',       'Cold Room 2', 'Shelf C1', 20,  5e7, '2026-02-01', '2026-08-01', 10.0),
  ('Bacillus subtilis KD-118', 'Cold Room 1', 'Shelf D1', 40,  2e9, '2026-04-10', '2026-10-10', 4.0)
) AS v(strain, room, pos, vol, cfu, mfg_date, exp_date, temp)
WHERE ms.strain_name = v.strain
ON CONFLICT DO NOTHING;

-- ─── NOTES FOR DEPLOYMENT ─────────────────────────────────────────────────────
-- 1. After running this seed:
--    a) Run the backend server
--    b) Create the admin user via:
--       POST /api/auth/users with { username: "admin", password: "Admin@2026!", full_name: "System Administrator", role: "admin" }
--    c) Or update the placeholder hash in users table directly using hashPassword()
--
-- 2. Then create operational users via POST /api/auth/users for each role:
--    gate_staff, store_person, store_manager, planner, planning_manager,
--    plant_supervisor, qc_person, sales_team
--
-- 3. The admin user created via API will have a proper PBKDF2 hash.
--    The placeholder row above should be updated or deleted.

SELECT 'Seed data applied successfully' AS status;
