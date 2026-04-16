-- Immutable ledger rules
CREATE OR REPLACE RULE no_update_stock_ledger AS ON UPDATE TO stock_ledger DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_stock_ledger AS ON DELETE TO stock_ledger DO INSTEAD NOTHING;

-- Lot sequence function
CREATE OR REPLACE FUNCTION get_next_lot_seq(p_item_code VARCHAR, p_year INT)
RETURNS INT AS $$
DECLARE v_seq INT;
BEGIN
  INSERT INTO lot_sequence(item_code, year, seq) VALUES(p_item_code, p_year, 1)
  ON CONFLICT(item_code, year) DO UPDATE SET seq = lot_sequence.seq + 1;
  SELECT seq INTO v_seq FROM lot_sequence WHERE item_code = p_item_code AND year = p_year;
  RETURN v_seq;
END;
$$ LANGUAGE plpgsql;

-- Inward status check trigger
CREATE OR REPLACE FUNCTION check_inward_status() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM print_master WHERE pack_id = NEW.pack_id AND status = 'AWAITING_INWARD') THEN
    RAISE EXCEPTION 'Pack % is not in AWAITING_INWARD status', NEW.pack_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_inward_status ON inward;
CREATE TRIGGER trg_check_inward_status BEFORE INSERT ON inward
  FOR EACH ROW EXECUTE FUNCTION check_inward_status();

-- Auto update print_master to INWARDED
CREATE OR REPLACE FUNCTION update_pm_after_inward() RETURNS TRIGGER AS $$
BEGIN
  UPDATE print_master SET status = 'INWARDED' WHERE pack_id = NEW.pack_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_pm_after_inward ON inward;
CREATE TRIGGER trg_update_pm_after_inward AFTER INSERT ON inward
  FOR EACH ROW EXECUTE FUNCTION update_pm_after_inward();

-- Auto update print_master status based on pack_balance
CREATE OR REPLACE FUNCTION update_pm_status_on_balance() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.remaining_qty <= 0 THEN
    UPDATE print_master SET status = 'EXHAUSTED' WHERE pack_id = NEW.pack_id;
  ELSIF NEW.remaining_qty < NEW.total_qty THEN
    UPDATE print_master SET status = 'PARTIALLY_ISSUED' WHERE pack_id = NEW.pack_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_pm_status_on_balance ON pack_balance;
CREATE TRIGGER trg_update_pm_status_on_balance AFTER INSERT OR UPDATE ON pack_balance
  FOR EACH ROW EXECUTE FUNCTION update_pm_status_on_balance();

-- Stock summary view
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
  rm.item_code,
  rm.item_name,
  rm.uom,
  COALESCE(SUM(pb.remaining_qty), 0) AS stock_in_packs,
  COALESCE(cm.current_qty, 0)        AS stock_in_container,
  COALESCE(SUM(pb.remaining_qty), 0) + COALESCE(cm.current_qty, 0) AS total_stock
FROM rm_master rm
LEFT JOIN pack_balance pb ON pb.item_code = rm.item_code AND pb.remaining_qty > 0
LEFT JOIN container_master cm ON cm.item_code = rm.item_code
GROUP BY rm.item_code, rm.item_name, rm.uom, cm.current_qty;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inward_item ON inward(item_code);
CREATE INDEX IF NOT EXISTS idx_print_master_item_lot ON print_master(item_code, lot_no);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_code);
CREATE INDEX IF NOT EXISTS idx_outward_indent ON outward(indent_id);
