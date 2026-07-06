-- UOM standardization patch — Phase 1 (RM/Recipe/Packing/Stock core tables)
-- Run once on any existing database. Applied to dev DB on 2026-07-03.
-- Run this on staging / production before deploying the UOM-aware backend code.
--
-- Canonicalizes every Phase 1 uom column to one of KG / L / NOS (mass /
-- volume / count). Two tables need actual numeric rescaling because their
-- real values aren't already KG/L-magnitude (recipe_db has g/mg/ml rows;
-- packing_materials.capacity has GMS/ML rows) — every other table here only
-- has case/spelling variants of an already-correct magnitude (Kg/kg -> KG,
-- Nos/nos -> NOS), so only the uom string changes, not the quantity.
--
-- recipe_db rows with uom = 'CFU/g' (microbial potency, not a mass/volume
-- quantity) are deliberately excluded from every statement below — left
-- completely untouched.

-- ── Spelling-only normalization (no quantity rescale) ──────────────────────

UPDATE rm_master        SET uom = 'KG'  WHERE uom IN ('Kg', 'kg');
UPDATE rm_master        SET uom = 'NOS' WHERE uom IN ('Nos', 'nos');

UPDATE print_master     SET uom = 'KG'  WHERE uom IN ('Kg', 'kg');
UPDATE print_master     SET uom = 'NOS' WHERE uom IN ('Nos', 'nos');

UPDATE container_master SET uom = 'KG'  WHERE uom IN ('Kg', 'kg');

UPDATE erp_packs        SET unit = 'KG' WHERE unit IN ('kg', 'Kg');

UPDATE erp_containers   SET uom = 'KG'  WHERE uom IN ('kg', 'Kg');

UPDATE packing_materials SET uom = 'NOS' WHERE uom IN ('Nos', 'nos');

-- bulk_location.uom and bulk_lot_entry.uom are already 'KG' in every
-- existing row — no statement needed, nothing to normalize today.

-- Just case/spelling on recipe_db's already-kg rows (no rescale):
UPDATE recipe_db SET uom = 'KG' WHERE uom IN ('kg', 'Kg');
UPDATE recipe_db SET uom = 'L'  WHERE uom = 'L';

-- ── Numeric rescale (unit AND value both change) ───────────────────────────

-- recipe_db.qtyPerUnit: g -> KG (÷1000), mg -> KG (÷1,000,000), ml -> L (÷1000)
UPDATE recipe_db SET qty_per_unit = qty_per_unit * 0.001,     uom = 'KG' WHERE uom = 'g';
UPDATE recipe_db SET qty_per_unit = qty_per_unit * 0.000001,  uom = 'KG' WHERE uom = 'mg';
UPDATE recipe_db SET qty_per_unit = qty_per_unit * 0.001,     uom = 'L'  WHERE uom = 'ml';

-- packing_materials.capacity: GMS -> KG (÷1000), ML -> L (÷1000), LT -> L (relabel only)
UPDATE packing_materials SET capacity = capacity * 0.001, capacity_unit = 'KG' WHERE capacity_unit = 'GMS';
UPDATE packing_materials SET capacity = capacity * 0.001, capacity_unit = 'L'  WHERE capacity_unit = 'ML';
UPDATE packing_materials SET capacity_unit = 'L' WHERE capacity_unit = 'LT';
-- capacity_unit = 'KG' rows and NULL rows: no change needed.
