import {
  CARRIER_OPTIONS,
  PRIMARY_PACKING,
  SECONDARY_PACKING,
  LABEL_TYPES,
  LABEL_NEEDS_DETAILS,
  UOMS,
  SECTIONS,
} from "../shared/constants.js";
import { calcTotalCS, addDays } from "../shared/utils.js";
import InhouseProductPicker from "./InhouseProductPicker.jsx";
import CustomerProductPicker from "./CustomerProductPicker.jsx";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none";
const label = "block text-xs font-semibold text-gray-500 mb-1";

export default function LineItemRow({
  item,
  idx,
  products,
  cpProfiles,
  onChange,
  onRemove,
  onProductPicked,
  onCpProductPicked,
}) {
  const set = (k, v) => onChange(idx, { ...item, [k]: v });

  const showLabelDetails = LABEL_NEEDS_DETAILS.has(item.labelType);
  const ppIsCustom =
    item.unitPackType &&
    !PRIMARY_PACKING.includes(item.unitPackType) &&
    item.unitPackType !== "";
  const spIsCustom =
    item.packingType &&
    !SECONDARY_PACKING.includes(item.packingType) &&
    item.packingType !== "";

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "16px",
        background: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* ── Row header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Line {idx + 1}
          </span>
          {item._memApplied && (
            <span style={{ fontSize: "11px", background: "#f0fdf4", color: "#15803d", fontWeight: 600, padding: "2px 8px", borderRadius: "99px" }}>
              Memory applied
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          style={{ fontSize: "12px", color: "#f87171", background: "none", border: "none", cursor: "pointer" }}
        >
          Remove
        </button>
      </div>

      {/* ── Product names — 2 cols ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <label className={label}>
            Customer Product Name *
            {cpProfiles.length > 0 && (
              <span style={{ marginLeft: "6px", color: "#16a34a", fontWeight: 400 }}>
                ({cpProfiles.length} known)
              </span>
            )}
          </label>
          <CustomerProductPicker
            value={item.customerProductName}
            cpProfiles={cpProfiles}
            onChange={(v) => set("customerProductName", v)}
            onSelect={(profile) => onCpProductPicked(idx, profile)}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label className={label}>Inhouse Product Name *</label>
          <InhouseProductPicker
            value={item.inhouseProductName}
            productCode={item.inhouseProductCode}
            products={products}
            onChange={(name, code) => {
              onChange(idx, { ...item, inhouseProductName: name, inhouseProductCode: code });
              if (code) onProductPicked(idx, code);
            }}
          />
        </div>
      </div>

      {/* ── CFU / Specs + Carrier — 2 cols ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <label className={label}>CFU / Specs</label>
          <input
            value={item.activeSpecs || ""}
            onChange={(e) => set("activeSpecs", e.target.value)}
            className={field}
            placeholder="e.g. 2×10^9 CFU/g"
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label className={label}>Carrier</label>
          <select
            value={item.carrier || ""}
            onChange={(e) => set("carrier", e.target.value)}
            className={field}
          >
            {CARRIER_OPTIONS.map((c) => (
              <option key={c} value={c}>{c || "— Select —"}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Qty row: Total Qty | Unit Qty | Section — 3 cols ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {/* Total Qty */}
        <div style={{ minWidth: 0 }}>
          <label className={label}>Total Qty *</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="number"
              value={item.totalQty}
              onChange={(e) => {
                const newQty = e.target.value;
                const newCS = calcTotalCS(newQty, item.unitQty, item.unitsPerCS);
                onChange(idx, { ...item, totalQty: newQty, ...(newCS ? { totalCS: newCS } : {}) });
              }}
              className={field}
              style={{ flex: "1 1 0", minWidth: 0 }}
              placeholder="0"
              min="0"
            />
            <select
              value={item.totalUom || "KG"}
              onChange={(e) => set("totalUom", e.target.value)}
              className={field}
              style={{ flexShrink: 0, width: "68px", padding: "8px 4px" }}
            >
              {UOMS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Unit Qty */}
        <div style={{ minWidth: 0 }}>
          <label className={label}>Unit Qty (per pack)</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="number"
              value={item.unitQty || ""}
              onChange={(e) => set("unitQty", e.target.value)}
              className={field}
              style={{ flex: "1 1 0", minWidth: 0 }}
              placeholder="e.g. 1"
              min="0"
            />
            <select
              value={item.unitUom || "KG"}
              onChange={(e) => set("unitUom", e.target.value)}
              className={field}
              style={{ flexShrink: 0, width: "68px", padding: "8px 4px" }}
            >
              {UOMS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Section */}
        <div style={{ minWidth: 0 }}>
          <label className={label}>Section / MFG Unit</label>
          <select
            value={item.sectionName || ""}
            onChange={(e) => set("sectionName", e.target.value)}
            className={field}
          >
            <option value="">— Select —</option>
            {SECTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── Packing — 2×2 grid ── */}
      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: "12px",
        }}
      >
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
          Packing
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* Primary pack */}
          <div style={{ minWidth: 0 }}>
            <label className={label}>Primary Pack</label>
            <select
              value={ppIsCustom ? "__CUSTOM__" : item.unitPackType || ""}
              onChange={(e) => {
                if (e.target.value === "__CUSTOM__") set("unitPackType", "");
                else set("unitPackType", e.target.value);
              }}
              className={field}
            >
              {PRIMARY_PACKING.map((p) => (
                <option key={p} value={p}>
                  {p === "__CUSTOM__" ? "+ Add Custom…" : p || "— Select —"}
                </option>
              ))}
            </select>
            {ppIsCustom && (
              <input
                value={item.unitPackType}
                onChange={(e) => set("unitPackType", e.target.value)}
                placeholder="Type custom…"
                className={field}
                style={{ marginTop: "6px", borderColor: "#bbf7d0" }}
              />
            )}
          </div>

          {/* Secondary pack */}
          <div style={{ minWidth: 0 }}>
            <label className={label}>Secondary Pack</label>
            <select
              value={spIsCustom ? "__CUSTOM__" : item.packingType || ""}
              onChange={(e) => {
                if (e.target.value === "__CUSTOM__") set("packingType", "");
                else set("packingType", e.target.value);
              }}
              className={field}
            >
              {SECONDARY_PACKING.map((p) => (
                <option key={p} value={p}>
                  {p === "__CUSTOM__" ? "+ Add Custom…" : p || "— Select —"}
                </option>
              ))}
            </select>
            {spIsCustom && (
              <input
                value={item.packingType}
                onChange={(e) => set("packingType", e.target.value)}
                placeholder="Type custom…"
                className={field}
                style={{ marginTop: "6px", borderColor: "#bbf7d0" }}
              />
            )}
          </div>

          {/* Units per secondary pack */}
          <div style={{ minWidth: 0 }}>
            <label className={label}>Unit Per Sec. Pack</label>
            <input
              type="number"
              value={item.unitsPerCS || ""}
              onChange={(e) => {
                const newUPS = e.target.value;
                const newCS = calcTotalCS(item.totalQty, item.unitQty, newUPS);
                onChange(idx, { ...item, unitsPerCS: newUPS, ...(newCS ? { totalCS: newCS } : {}) });
              }}
              className={field}
              placeholder="e.g. 10"
              min="0"
            />
          </div>

          {/* Total secondary packs */}
          <div style={{ minWidth: 0 }}>
            <label className={label}>No. of Sec. Packs</label>
            <input
              type="number"
              value={item.totalCS || ""}
              onChange={(e) => set("totalCS", e.target.value)}
              className={field}
              placeholder="Auto or enter"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* ── Label details ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
          Label Details
        </p>
        <div style={{ maxWidth: "260px" }}>
          <label className={label}>Label Type</label>
          <select
            value={item.labelType || ""}
            onChange={(e) => set("labelType", e.target.value)}
            className={field}
          >
            {LABEL_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>{lt.label}</option>
            ))}
          </select>
          {item.labelType && !LABEL_NEEDS_DETAILS.has(item.labelType) && (
            <p style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>No print details needed</p>
          )}
        </div>

        {showLabelDetails && (
          <div
            style={{
              marginTop: "12px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "12px",
              background: "#f0fdf4",
              border: "1px solid #dcfce7",
              borderRadius: "10px",
              padding: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <label style={{ ...{}, fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>Batch No.</label>
              <input
                value={item.batchNo || ""}
                onChange={(e) => set("batchNo", e.target.value)}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="e.g. GAS250601"
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>Mfg. Date</label>
              <input
                type="date"
                value={item.mfgDate || ""}
                onChange={(e) => {
                  set("mfgDate", e.target.value);
                  if (item._shelfLifeDays && e.target.value)
                    set("expDate", addDays(e.target.value, item._shelfLifeDays));
                }}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>Exp. Date</label>
              <input
                type="date"
                value={item.expDate || ""}
                onChange={(e) => set("expDate", e.target.value)}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>MRP (₹)</label>
              <input
                type="number"
                value={item.mrp || ""}
                onChange={(e) => set("mrp", e.target.value)}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="optional"
                min="0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
