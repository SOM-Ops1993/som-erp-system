import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { packsApi, rmApi, gateApi } from "../../../../../api/inventory.js";
import { packingMaterialApi } from "../../../../../api/masters.js";
import { Button, IconButton } from "../../../../../components/ui";
import { getChips, SUB_TYPES } from "../../../../masters/packing/components/packing-constants/packingConstants.jsx";

// Packing Material Master's own browsing UI (CategoryList/SubTypeGrid) only
// renders this fixed category → sub-type structure — a row whose subType
// doesn't match one of these is invisible there (can't be seen, edited, or
// deleted from Packing Master at all). Applying the same check here keeps
// this item search limited to packing materials the user can actually find
// and manage in Packing Material Master, instead of surfacing orphaned rows
// that read as "materials I never created."
function isProperlyCategorized(pm) {
  return (SUB_TYPES[pm.category] || []).some(s => s.value === pm.subType);
}
import "./GenerateForm.css";

const todayStr = () => new Date().toISOString().split("T")[0];

const BLANK_ITEM = {
  selectedItem: null,   // { itemCode, itemName, uom, _type: 'rm'|'pm', _pmData?: {...} }
  numberOfBags: "",
  packQty: "",
  customerBatchCode: "",
  expiryDate: "",
};
const BLANK_HDR = { supplier: "", invoiceNo: "", receivedDate: todayStr() };

const inp = {
  width: "100%", border: "1px solid #d1d5db", borderRadius: "8px",
  padding: "8px 12px", fontSize: "13px", outline: "none", boxSizing: "border-box",
};
const lbl = {
  display: "block", fontSize: "12px", fontWeight: 600,
  color: "#4b5563", marginBottom: "4px",
};

// ── Spec chips for packing material ──────────────────────────────────────────
function PmChips({ pmData }) {
  const chips = getChips(pmData);
  if (!chips.length) return null;
  const colorMap = {
    blue: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    violet: { bg: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
    emerald: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    amber: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    gray: { bg: "#f9fafb", border: "#e5e7eb", text: "#374151" },
    pink: { bg: "#fdf2f8", border: "#fbcfe8", text: "#831843" },
    sky: { bg: "#f0f9ff", border: "#bae6fd", text: "#0c4a6e" },
    orange: { bg: "#fff7ed", border: "#fed7aa", text: "#7c2d12" },
    slate: { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" },
    yellow: { bg: "#fefce8", border: "#fde047", text: "#713f12" },
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
      {chips.map((chip, i) => {
        const c = colorMap[chip.color] || colorMap.gray;
        return (
          <span key={i} style={{
            fontSize: "11px", fontWeight: 500, padding: "2px 7px",
            borderRadius: "12px", border: `1px solid ${c.border}`,
            background: c.bg, color: c.text,
            fontStyle: chip.italic ? "italic" : "normal",
          }}>
            {chip.label}
          </span>
        );
      })}
    </div>
  );
}

// ── Per-item line ─────────────────────────────────────────────────────────────
function ItemLine({ idx, item, rmList, pmList, onChange, onRemove, canRemove }) {
  const [search, setSearch]     = useState(item.selectedItem?.itemName || "");
  const [showDrop, setShowDrop] = useState(false);
  const [nextLot, setNextLot]   = useState("");

  // Combine RM and PM into one searchable list
  const combined = [
    ...rmList.map(r => ({ ...r, _type: "rm" })),
    ...pmList.map(p => ({ ...p, _type: "pm", uom: p.uom || "Nos" })),
  ];

  const filtered = combined.filter(r =>
    !search ||
    (r.itemName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.itemCode || "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const filteredRm = filtered.filter(r => r._type === "rm");
  const filteredPm = filtered.filter(r => r._type === "pm");

  const pickItem = async (r) => {
    setSearch(r.itemName);
    setShowDrop(false);
    const sel = {
      itemCode: r.itemCode,
      itemName: r.itemName,
      uom: r.uom || "Nos",
      _type: r._type,
      _pmData: r._type === "pm" ? r : undefined,
    };
    onChange({ ...item, selectedItem: sel });
    if (r._type === "rm") {
      setNextLot("…");
      try {
        const res = await packsApi.nextLot(r.itemCode);
        setNextLot(res.data?.lotNo || "");
      } catch { setNextLot(""); }
    } else {
      setNextLot("");
    }
  };

  const clearItem = () => {
    setSearch(""); setNextLot("");
    onChange({ ...item, selectedItem: null });
  };

  const isPm = item.selectedItem?._type === "pm";

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px", background: "#f8fafc" }}>
      {/* Item header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Item {idx + 1}
        </span>
        {canRemove && (
          <IconButton icon={X} variant="danger" size="xs" tooltip="Remove item" onClick={onRemove} />
        )}
      </div>

      {/* Search input */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <label style={lbl}>Item *</label>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setShowDrop(true);
            if (item.selectedItem && e.target.value !== item.selectedItem.itemName) clearItem();
          }}
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 160)}
          placeholder="Search item by name or code…"
          style={inp}
        />

        {/* Dropdown */}
        {showDrop && (filteredRm.length > 0 || filteredPm.length > 0) && (
          <div style={{
            position: "absolute", zIndex: 20, width: "100%",
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            marginTop: "4px", maxHeight: "240px", overflowY: "auto",
          }}>
            {/* RM section */}
            {filteredRm.length > 0 && (
              <>
                <div style={{ padding: "5px 12px 3px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                  Raw Materials
                </div>
                {filteredRm.map(r => (
                  <button key={r.itemCode} type="button"
                    onMouseDown={() => pickItem(r)}
                    style={{ width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "#dbeafe", color: "#1e40af" }}>RM</span>
                      <span style={{ fontWeight: 500 }}>{r.itemName}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{r.itemCode}</span>
                  </button>
                ))}
              </>
            )}

            {/* PM section */}
            {filteredPm.length > 0 && (
              <>
                <div style={{ padding: "5px 12px 3px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", borderTop: filteredRm.length > 0 ? "1px solid #e2e8f0" : "none", background: "#f8fafc" }}>
                  Packing Materials
                </div>
                {filteredPm.map(p => {
                  const chips = getChips(p);
                  return (
                    <button key={p.itemCode} type="button"
                      onMouseDown={() => pickItem(p)}
                      style={{ width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "#dcfce7", color: "#166534" }}>PM</span>
                          <span style={{ fontWeight: 500 }}>{p.itemName}</span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace", flexShrink: 0, marginLeft: "8px" }}>{p.itemCode}</span>
                      </div>
                      {chips.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "3px", paddingLeft: "28px" }}>
                          {chips.slice(0, 4).map((chip, i) => (
                            <span key={i} style={{ fontSize: "10px", color: "#6b7280", padding: "0px 5px", borderRadius: "8px", background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected item badge */}
      {item.selectedItem && (
        <div style={{
          marginBottom: "10px", padding: "9px 12px",
          background: isPm ? "#f0fdf4" : "#eff6ff",
          border: isPm ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
          borderRadius: "7px",
        }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", fontSize: "12px", color: isPm ? "#15803d" : "#1e40af" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: isPm ? "#dcfce7" : "#dbeafe", color: isPm ? "#166534" : "#1e40af" }}>
              {isPm ? "PM" : "RM"}
            </span>
            <span style={{ fontWeight: 600 }}>{item.selectedItem.itemName}</span>
            <span style={{ fontFamily: "monospace", color: isPm ? "#16a34a" : "#3b82f6" }}>{item.selectedItem.itemCode}</span>
            <span>UOM: <strong>{item.selectedItem.uom}</strong></span>
            {nextLot && <span style={{ marginLeft: "auto", fontWeight: 700 }}>Next Lot: {nextLot}</span>}
          </div>
          {isPm && item.selectedItem._pmData && (
            <PmChips pmData={item.selectedItem._pmData} />
          )}
        </div>
      )}

      {/* Qty fields */}
      <div className="gf-qty-grid" style={{ marginBottom: "10px" }}>
        <div>
          <label style={lbl}>Number of Bags *</label>
          <input type="number" min="1"
            value={item.numberOfBags}
            onChange={e => onChange({ ...item, numberOfBags: e.target.value })}
            placeholder="e.g. 20" style={inp}
          />
        </div>
        <div>
          <label style={lbl}>Qty per Bag ({item.selectedItem?.uom || "KG"}) *</label>
          <input type="number" step="0.01" min="0.01"
            value={item.packQty}
            onChange={e => onChange({ ...item, packQty: e.target.value })}
            placeholder="e.g. 25" style={inp}
          />
        </div>
      </div>

      {/* Customer batch code (optional) */}
      <div>
        <label style={{ ...lbl, color: "#6b7280" }}>
          Supplier Batch Code
          <span style={{ fontWeight: 400, fontSize: "11px", marginLeft: "4px", color: "#9ca3af" }}>(optional)</span>
        </label>
        <input
          value={item.customerBatchCode}
          onChange={e => onChange({ ...item, customerBatchCode: e.target.value })}
          placeholder="e.g. BATCH-2026-001"
          style={{ ...inp, background: "#fafafa" }}
        />
      </div>

      {/* Expiry date — only for Raw Materials */}
      {!isPm && (
        <div style={{ marginTop: "10px" }}>
          <label style={{ ...lbl, color: "#6b7280" }}>
            Expiry Date
            <span style={{ fontWeight: 400, fontSize: "11px", marginLeft: "4px", color: "#9ca3af" }}>(optional)</span>
          </label>
          <input
            type="date"
            value={item.expiryDate || ""}
            onChange={e => onChange({ ...item, expiryDate: e.target.value })}
            style={{ ...inp, background: "#fafafa" }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function GenerateForm({ onGenerated, prefill, onGateUsed }) {
  const [rmList, setRmList]           = useState([]);
  const [pmList, setPmList]           = useState([]);
  const [hdr, setHdr]                 = useState(BLANK_HDR);
  const [items, setItems]             = useState([{ ...BLANK_ITEM }]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [linkedEntry, setLinkedEntry] = useState(null);

  // Load RM list and packing materials once
  useEffect(() => {
    rmApi.list({}).then(r => setRmList(r.data || [])).catch(console.error);
    packingMaterialApi.list().then(r => setPmList((r.data || []).filter(isProperlyCategorized))).catch(console.error);
  }, []);

  // Auto-fill header from gate inward selection
  useEffect(() => {
    if (!prefill) return;
    setHdr({
      supplier:     prefill.supplierName || "",
      invoiceNo:    prefill.invoiceNo    || "",
      receivedDate: prefill.createdAt
        ? new Date(prefill.createdAt).toISOString().split("T")[0]
        : todayStr(),
    });
    setLinkedEntry(prefill);
    setError("");
  }, [prefill]);

  const setH = (k, v) => setHdr(h => ({ ...h, [k]: v }));

  const addItem    = ()         => setItems(its => [...its, { ...BLANK_ITEM }]);
  const removeItem = (i)        => setItems(its => its.filter((_, idx) => idx !== i));
  const updateItem = (i, next)  => setItems(its => its.map((it, idx) => idx === i ? next : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.selectedItem) {
        setError(`Item ${i + 1}: please select a raw material or packing material`);
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
    try {
      const allResults = [];
      for (const it of items) {
        const res = await packsApi.generate({
          itemCode:          it.selectedItem.itemCode,
          itemName:          it.selectedItem.itemName,
          uom:               it.selectedItem.uom,
          ...hdr,
          numberOfBags:      parseInt(it.numberOfBags),
          packQty:           parseFloat(it.packQty),
          customerBatchCode: it.customerBatchCode || undefined,
          expiryDate:        it.expiryDate        || undefined,
        });
        allResults.push(res.data);
      }
      setItems([{ ...BLANK_ITEM }]);
      setHdr(BLANK_HDR);
      if (linkedEntry?.inwardId) {
        try { await gateApi.updateInward(linkedEntry.inwardId, { status: "approved" }) } catch { /* ignore */ }
      }
      setLinkedEntry(null);
      const totalPacks = allResults.reduce((n, r) => n + (r?.packs?.length || 0), 0);
      onGenerated?.({ results: allResults, totalPacks });
      onGateUsed?.();
    } catch (ex) {
      setError(ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gf-wrap">
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
            {" "}{linkedEntry.supplierName}
            {linkedEntry.invoiceNo && ` — ${linkedEntry.invoiceNo}`}
            {linkedEntry.vehicleNo && ` — Vehicle: ${linkedEntry.vehicleNo}`}
          </div>
          <IconButton icon={X} variant="ghost" size="sm" tooltip="Unlink gate entry"
            onClick={() => { setLinkedEntry(null); setHdr(BLANK_HDR); }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Invoice header ──────────────────────────────────────── */}
        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Invoice Details
          </p>
          <div className="gf-hdr-grid">
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Supplier</label>
              <input value={hdr.supplier} onChange={e => setH("supplier", e.target.value)} placeholder="Supplier name" style={inp} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Invoice No</label>
              <input value={hdr.invoiceNo} onChange={e => setH("invoiceNo", e.target.value)} placeholder="INV-2026-001" style={inp} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Received Date</label>
              <input type="date" value={hdr.receivedDate} onChange={e => setH("receivedDate", e.target.value)} style={inp} />
            </div>
          </div>
        </div>

        {/* ── Item lines ──────────────────────────────────────────── */}
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
                pmList={pmList}
                onChange={next => updateItem(i, next)}
                onRemove={() => removeItem(i)}
                canRemove={items.length > 1}
              />
            ))}
          </div>
        </div>

        {/* + Add Item */}
        <Button variant="outline-gray" fullWidth className="border-dashed mb-3.5" onClick={addItem}>
          + Add Item
        </Button>

        {/* Submit */}
        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          {loading
            ? "Generating…"
            : `🖨️ Generate Pack IDs${items.length > 1 ? ` (${items.length} items)` : ""}`}
        </Button>
      </form>
    </div>
  );
}
