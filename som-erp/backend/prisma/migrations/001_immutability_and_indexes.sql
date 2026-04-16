-- =========================================================
-- Migration: Immutability rules + performance indexes
-- Applied AFTER prisma migrate (via seed or manual run)
-- =========================================================

-- IMMUTABLE STOCK LEDGER
-- Prevent any UPDATE or DELETE on stock_ledger
CREATE OR REPLACE RULE no_update_stock_ledger AS
  ON UPDATE TO stock_ledger DO INSTEAD NOTHING;

CREATE OR REPLACE RULE no_delete_stock_ledger AS
  ON DELETE TO stock_ledger DO INSTEAD NOTHING;

-- PREVENT RE-INWARD (pack can only be inwarded once — already enforced by UNIQUE)
-- Additional check: pack status must be AWAITING_INWARD at inward time
CREATE OR REPLACE FUNCTION check_inward_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT status FROM print_master WHERE pack_id = NEW.pack_id) != 'AWAITING_INWARD' THEN
    RAISE EXCEPTION 'Pack % is not in AWAITING_INWARD status. Cannot inward again.', NEW.pack_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_inward_status ON inward;
CREATE TRIGGER trg_check_inward_status
  BEFORE INSERT ON inward
  FOR EACH ROW EXECUTE FUNCTION check_inward_status();

-- AUTO UPDATE pack_master status after inward insert
CREATE OR REPLACE FUNCTION update_print_master_after_inward()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE print_master SET status = 'INWARDED' WHERE pack_id = NEW.pack_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_pm_after_inward ON inward;
CREATE TRIGGER trg_update_pm_after_inward
  AFTER INSERT ON inward
  FOR EACH ROW EXECUTE FUNCTION update_print_master_after_inward();

-- AUTO UPDATE print_master status when pack is exhausted
CREATE OR REPLACE FUNCTION update_print_master_status_on_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_exhausted = TRUE THEN
    UPDATE print_master SET status = 'EXHAUSTED' WHERE pack_id = NEW.pack_id;
  ELSIF NEW.issued_qty > 0 AND NEW.is_exhausted = FALSE THEN
    UPDATE print_master SET status = 'PARTIALLY_ISSUED' WHERE pack_id = NEW.pack_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_pm_status_on_balance ON pack_balance;
CREATE TRIGGER trg_update_pm_status_on_balance
  AFTER UPDATE ON pack_balance
  FOR EACH ROW EXECUTE FUNCTION update_print_master_status_on_balance();

-- STOCK SUMMARY VIEW (current balance per item)
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
  rm.item_code,
  rm.item_name,
  rm.uom,
  rm.reorder_level,
  COALESCE(SUM(CASE WHEN sl.transaction_type IN ('INWARD', 'CONTAINER_IN') THEN sl.in_qty ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(sl.out_qty), 0) AS total_out,
  COALESCE(
    (SELECT balance FROM stock_ledger WHERE item_code = rm.item_code ORDER BY timestamp DESC LIMIT 1),
    0
  ) AS current_balance,
  COUNT(DISTINCT CASE WHEN pm.status = 'AWAITING_INWARD' THEN pm.pack_id END) AS packs_awaiting_inward,
  COUNT(DISTINCT CASE WHEN pm.status = 'INWARDED' THEN pm.pack_id END) AS packs_in_stock,
  CASE
    WHEN COALESCE(
      (SELECT balance FROM stock_ledger WHERE item_code = rm.item_code ORDER BY timestamp DESC LIMIT 1), 0
    ) <= 0 THEN 'OUT_OF_STOCK'
    WHEN rm.reorder_level IS NOT NULL AND COALESCE(
      (SELECT balance FROM stock_ledger WHERE item_code = rm.item_code ORDER BY timestamp DESC LIMIT 1), 0
    ) <= rm.reorder_level THEN 'LOW_STOCK'
    ELSE 'IN_STOCK'
  END AS stock_status
FROM rm_master rm
LEFT JOIN stock_ledger sl ON sl.item_code = rm.item_code
LEFT JOIN print_master pm ON pm.item_code = rm.item_code
GROUP BY rm.item_code, rm.item_name, rm.uom, rm.reorder_level;

-- LOT SEQUENCE atomic increment function
CREATE OR REPLACE FUNCTION get_next_lot_seq(p_item_code VARCHAR, p_year INT)
RETURNS INT AS $$
DECLARE
  v_seq INT;
BEGIN
  INSERT INTO lot_sequence (item_code, year, last_seq)
  VALUES (p_item_code, p_year, 1)
  ON CONFLICT (item_code, year)
  DO UPDATE SET last_seq = lot_sequence.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN v_seq;
END;
$$ LANGUAGE plpgsql;

-- RUNNING BALANCE function (get balance just before a timestamp)
CREATE OR REPLACE FUNCTION get_balance_at(p_item_code VARCHAR, p_at TIMESTAMPTZ)
RETURNS NUMERIC AS $$
  SELECT COALESCE(
    (SELECT balance FROM stock_ledger
     WHERE item_code = p_item_code AND timestamp <= p_at
     ORDER BY timestamp DESC, ledger_id DESC LIMIT 1),
    0
  );
$$ LANGUAGE sql STABLE;
