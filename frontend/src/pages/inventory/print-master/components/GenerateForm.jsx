import { useState, useEffect } from "react";
import { packsApi, rmApi, gateApi } from "../../../../api/inventory.js";
import QRCodePreview from "./QRCodePreview.jsx";

const todayStr = () => new Date().toISOString().split("T")[0];
const BLANK_ITEM = { selectedRm: null, numberOfBags: "", packQty: "" };
const BLANK_HDR  = { supplier: "", invoiceNo: "", receivedDate: todayStr() };

const inp = {
  width: "100%", border: "1px solid #d1d5db", borderRadius: "8px",
  padding: "8px 12px", fontSize: "13px", outline: "none", boxSizing: "border-box",
};
const lbl = {
  display: "block", fontSize: "12px", fontWeight: 600,
  color: "#4b5563", marginBottom: "4px",
};

// ── Per-item RM search line ───────────────────────────────────────────────────
function ItemLine({ idx, item, rmList, onChange, onRemove, canRemove }) {
  const [search, setSearch]     = useState(item.selectedRm?.itemName || "");
  const [showDrop, setShowDrop] = useState(false);
  const [nextLot, setNextLot]   = useState("");

  const filtered = rmList
    .filter(r =>
      !search ||
      r.itemName.toLowerCase().includes(search.toLowerCase()) ||
      r.itemCode.toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 20);

  const pickRm = async (rm) => {
    setSearch(rm.itemName);
    setShowDrop(false);
    setNextLot("…");
    onChange({ ...item, selectedRm: { itemCode: rm.itemCode, itemName: rm.itemName, uom: rm.uom } });
    try {
      const r = await packsApi.nextLot(rm.itemCode);
      setNextLot(r.data?.lotNo || "");
    } catch {
      setNextLot("");
    }
  };

  const clearRm = () => {
    setSearch(""); setNextLot("");
    onChange({ ...item, selectedRm: null });
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px", background: "#f8fafc" }}>
      {/* Item header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Item {idx + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{ fontSize: "12px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {/* RM search */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <label style={lbl}>Item (Raw Material) *</label>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setShowDrop(true);
            if (item.selectedRm && e.target.value !== item.selectedRm.itemName) clearRm();
          }}
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 160)}
          placeholder="Search item by name or code…"
          style={inp}
        />
        {showDrop && filtered.length > 0 && (
          <div style={{
            position: "absolute", zIndex: 20, width: "100%",
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            marginTop: "4px", maxHeight: "180px", overflowY: "auto",
          }}>
            {filtered.map(r => (
              <button
                key={r.itemCode}
                type="button"
                onMouseDown={() => pickRm(r)}
                style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <span style={{ fontWeight: 500 }}>{r.itemName}</span>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{r.itemCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected RM badge */}
      {item.selectedRm && (
        <div style={{ marginBottom: "10px", padding: "8px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "7px", fontSize: "12px", color: "#1e40af", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>{item.selectedRm.itemName}</span>
          <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{item.selectedRm.itemCode}</span>
          <span>UOM: <strong>{item.selectedRm.uom}</strong></span>
          {nextLot && <span style={{ marginLeft: "auto", fontWeight: 700 }}>Next Lot: {nextLot}</span>}
        </div>
      )}

      {/* Qty fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={lbl}>Number of Bags *</label>
          <input
            type="number" min="1"
            value={item.numberOfBags}
            onChange={e => onChange({ ...item, numberOfBags: e.target.value })}
            placeholder="e.g. 20"
            style={inp}
          />
        </div>
        <div>
          <label style={lbl}>Qty per Bag ({item.selectedRm?.uom || "KG"}) *</label>
          <input
            type="number" step="0.01" min="0.01"
            value={item.packQty}
            onChange={e => onChange({ ...item, packQty: e.target.value })}
            placeholder="e.g. 25"
            style={inp}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function GenerateForm({ onGenerated, prefill, onGateUsed }) {
  const [rmList, setRmList]         = useState([]);
  const [hdr, setHdr]               = useState(BLANK_HDR);
  const [items, setItems]           = useState([{ ...BLANK_ITEM }]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [results, setResults]       = useState([]);
  const [linkedEntry, setLinkedEntry] = useState(null);
  const [showQR, setShowQR]         = useState(false);

  // Load shared RM list once
  useEffect(() => {
    rmApi.list({}).then(r => setRmList(r.data || [])).catch(console.error);
  }, []);

  // Auto-fill header when a gate inward is selected
  useEffect(() => {
    if (!prefill) return;
    setHdr({
      supplier:     prefill.supplier_name || "",
      invoiceNo:    prefill.invoice_no    || "",
      receivedDate: prefill.created_at
        ? new Date(prefill.created_at).toISOString().split("T")[0]
        : todayStr(),
    });
    setLinkedEntry(prefill);
    setResults([]);
    setError("");
  }, [prefill]);

  const setH = (k, v) => setHdr(h => ({ ...h, [k]: v }));

  const addItem    = ()    => setItems(its => [...its, { ...BLANK_ITEM }]);
  const removeItem = (i)   => setItems(its => its.filter((_, idx) => idx !== i));
  const updateItem = (i, next) => setItems(its => its.map((it, idx) => idx === i ? next : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate all item lines
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.selectedRm) {
        setError(`Item ${i + 1}: please select a raw material`);
        return;
      }
      if (!it.numberOfBags || parseInt(it.numberOfBags) < 1) {
        setError(`Item ${i + 1}: enter a valid number of bags`);
        return;
      }
      if (!it.packQty || parseFloat(it.packQty) <= 0) {
        setError(`Item ${i + 1}: enter a valid qty per bag`);
        return;
      }
    }

    setLoading(true);
    setError("");
    setResults([]);
    try {
      const allResults = [];
      for (const it of items) {
        const res = await packsApi.generate({
          ...it.selectedRm,
          ...hdr,
          numberOfBags: parseInt(it.numberOfBags),
          packQty:      parseFloat(it.packQty),
        });
        allResults.push(res.data);
      }
      setResults(allResults);
      setItems([{ ...BLANK_ITEM }]);
      setHdr(BLANK_HDR);
      // Mark the gate entry as approved so it leaves the "Incoming Gate Entries" panel
      if (linkedEntry?.inward_id) {
        try { await gateApi.updateInward(linkedEntry.inward_id, { status: "approved" }) } catch { /* ignore auth errors */ }
      }
      setLinkedEntry(null);
      onGenerated?.();
      onGateUsed?.();
    } catch (ex) {
      setError(ex.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPacks = results.reduce((n, r) => n + (r?.packs?.length || 0), 0);

  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "22px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
        Generate Pack Labels
      </h2>
      <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94a3b8" }}>
        Fill invoice details, add items, then generate QR labels
      </p>

      {/* Linked gate entry banner */}
      {linkedEntry && (
        <div style={{ marginBottom: "14px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "12px", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <div>
            <span style={{ fontWeight: 700 }}>📎 Gate entry linked:</span>
            {" "}{linkedEntry.supplier_name}
            {linkedEntry.invoice_no  && ` — ${linkedEntry.invoice_no}`}
            {linkedEntry.vehicle_no  && ` — Vehicle: ${linkedEntry.vehicle_no}`}
          </div>
          <button
            type="button"
            onClick={() => { setLinkedEntry(null); setHdr(BLANK_HDR); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#15803d", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* Success results */}
      {results.length > 0 && (
        <div style={{ marginBottom: "16px", padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#15803d", fontSize: "13px" }}>
            ✅ Generated {totalPacks} packs across {results.length} item{results.length !== 1 ? "s" : ""}
          </p>
          {results.map((r, i) => r && (
            <div key={i} style={{ fontSize: "12px", color: "#166534", marginBottom: "6px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600 }}>{r.packs?.[0]?.itemName || r.packs?.[0]?.itemCode || `Item ${i + 1}`}</span>
              <span>Lot: <strong>{r.lotNo}</strong></span>
              <span>{r.packs?.length} packs</span>
              {r.packs?.[0] && (
                <a
                  href={packsApi.batchLabelsUrl(r.packs[0].itemCode, r.lotNo)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600 }}
                >
                  🖨️ PDF Labels
                </a>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowQR(true)}
            style={{
              marginTop: "8px", padding: "7px 16px",
              background: "#1a3a6b", color: "#fff",
              border: "none", borderRadius: "7px",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
            }}
          >
            📦 Show QR Labels
          </button>
        </div>
      )}

      {showQR && (
        <QRCodePreview results={results} onClose={() => setShowQR(false)} />
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Invoice header ─────────────────────────────────────── */}
        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Invoice Details
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Supplier</label>
              <input
                value={hdr.supplier}
                onChange={e => setH("supplier", e.target.value)}
                placeholder="Supplier name"
                style={inp}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Invoice No</label>
              <input
                value={hdr.invoiceNo}
                onChange={e => setH("invoiceNo", e.target.value)}
                placeholder="INV-2026-001"
                style={inp}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Received Date</label>
              <input
                type="date"
                value={hdr.receivedDate}
                onChange={e => setH("receivedDate", e.target.value)}
                style={inp}
              />
            </div>
          </div>
        </div>

        {/* ── Item lines ─────────────────────────────────────────── */}
        <div style={{ marginBottom: "12px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Items ({items.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map((it, i) => (
              <ItemLine
                key={i}
                idx={i}
                item={it}
                rmList={rmList}
                onChange={next => updateItem(i, next)}
                onRemove={() => removeItem(i)}
                canRemove={items.length > 1}
              />
            ))}
          </div>
        </div>

        {/* + Add Item */}
        <button
          type="button"
          onClick={addItem}
          style={{
            width: "100%", padding: "10px", background: "#f8fafc",
            border: "1.5px dashed #94a3b8", borderRadius: "8px",
            color: "#475569", fontSize: "13px", fontWeight: 600,
            cursor: "pointer", marginBottom: "14px",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.color = "#475569"; }}
        >
          + Add Item
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "12px",
            background: loading ? "#93c5fd" : "#2563eb",
            color: "#fff", border: "none", borderRadius: "9px",
            fontSize: "15px", fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "Generating…"
            : `🖨️ Generate Pack IDs${items.length > 1 ? ` (${items.length} items)` : ""}`}
        </button>
      </form>
    </div>
  );
}
