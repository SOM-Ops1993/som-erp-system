import { useState, useEffect } from "react";
import { cpProfileApi } from "../../../../api/sales.js";
import {
  COMPANIES,
  ORDER_TYPES,
  BLANK_ITEM,
  BRAND,
} from "../shared/constants.js";
import { suggestNextBatch, addDays, calcTotalCS } from "../shared/utils.js";
import CustomerNamePicker from "./CustomerNamePicker.jsx";
import LineItemRow from "./LineItemRow.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// CreateSalesOrder
// The booking form used by the sales team to create or edit a sales order.
// Responsibilities:
//   - Order header state (DI No., customer, company, dates…)
//   - Dynamic product lines (add / edit / remove)
//   - Customer-product memory: loads cpProfiles per customer, auto-fills lines
//   - Validation and submission
//
// Props:
//   initial  {object|undefined}  pre-filled data when editing an existing order
//   products {array}             product master list
//   profiles {array}             customer profiles (for CustomerNamePicker)
//   onSave   {fn}                async (formData) => void
//   onCancel {fn}                () => void
// ─────────────────────────────────────────────────────────────────────────────
export default function CreateSalesOrder({
  initial,
  products,
  profiles,
  onSave,
  onCancel,
}) {
  const today = new Date().toISOString().split("T")[0];

  const [hdr, setHdr] = useState({
    company: COMPANIES[0] || "SOM",
    diNo: "",
    customerName: "",
    orderType: "DOMESTIC",
    salesStaff: "",
    orderReceivedDate: today,
    remarks: "",
    ...initial,
  });

  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map((it) => ({
          ...BLANK_ITEM,
          ...it,
          mfgDate: it.mfgDate
            ? new Date(it.mfgDate).toISOString().split("T")[0]
            : "",
          expDate: it.expDate
            ? new Date(it.expDate).toISOString().split("T")[0]
            : "",
        }))
      : [{ ...BLANK_ITEM }],
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [cpProfiles, setCpProfiles] = useState([]);

  const setH = (k, v) => setHdr((h) => ({ ...h, [k]: v }));

  // ── Load customer-product profiles whenever the customer name changes ───────
  useEffect(() => {
    if (!hdr.customerName?.trim()) {
      setCpProfiles([]);
      return;
    }
    cpProfileApi
      .forCustomer(hdr.customerName.trim())
      .then((res) => setCpProfiles(res.data || []))
      .catch(() => setCpProfiles([]));
  }, [hdr.customerName]);

  // ── Memory apply — shared by both picker paths ────────────────────────────
  function applyMemoryProfile(idx, mem) {
    if (!mem) return;
    const suggested = mem.lastBatchNo ? suggestNextBatch(mem.lastBatchNo) : "";
    setItems((its) =>
      its.map((it, i) => {
        if (i !== idx) return it;
        const newUnitQty = mem.unitQty ? String(mem.unitQty) : it.unitQty;
        const newUnitUom = mem.unitUom || it.unitUom;
        const newUnitsPerCS = mem.unitsPerCS
          ? String(mem.unitsPerCS)
          : it.unitsPerCS;
        const newTotalCS = calcTotalCS(it.totalQty, newUnitQty, newUnitsPerCS);
        const mfgDate = it.mfgDate || today;
        return {
          ...it,
          activeSpecs: mem.activeSpecs || it.activeSpecs,
          carrier: mem.carrier || it.carrier,
          sectionName: mem.sectionName || it.sectionName,
          unitQty: newUnitQty,
          unitUom: newUnitUom,
          unitPackType: mem.primaryPack || it.unitPackType,
          packingType: mem.secondaryPack || it.packingType,
          unitsPerCS: newUnitsPerCS,
          totalCS: newTotalCS || it.totalCS,
          totalUom: mem.totalUom || it.totalUom,
          labelType: mem.labelType || it.labelType,
          mrp: mem.mrp ? String(mem.mrp) : it.mrp,
          batchNo: suggested || it.batchNo,
          mfgDate,
          expDate: mem.shelfLifeDays
            ? addDays(mfgDate, mem.shelfLifeDays)
            : it.expDate,
          _shelfLifeDays: mem.shelfLifeDays || null,
          _memApplied: true,
        };
      }),
    );
  }

  // Called when user picks from InhouseProductPicker (resolves to productCode)
  function applyProductMemory(idx, productCode) {
    const mem =
      cpProfiles.find((p) => p.productCode === productCode) ||
      cpProfiles.find((p) => p.inhouseName === productCode);
    applyMemoryProfile(idx, mem);
  }

  // Called when user picks from CustomerProductPicker (full profile object)
  function applyCpProductMemory(idx, profile) {
    applyMemoryProfile(idx, profile);
    if (profile.inhouseName || profile.productCode) {
      setItems((its) =>
        its.map((it, i) =>
          i !== idx
            ? it
            : {
                ...it,
                inhouseProductName:
                  profile.inhouseName || it.inhouseProductName,
                inhouseProductCode:
                  profile.productCode || it.inhouseProductCode,
              },
        ),
      );
    }
  }

  // ── Validation + submit ───────────────────────────────────────────────────
  async function submit(e) {
    e.preventDefault();
    if (!hdr.diNo.trim()) return setErr("DI No. is required");
    if (!hdr.customerName.trim()) return setErr("Customer Name is required");
    if (items.some((it) => !it.customerProductName || !it.totalQty))
      return setErr("Each line needs a Customer Product Name and Quantity");
    setSaving(true);
    setErr("");
    try {
      await onSave({ ...hdr, items });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {err && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
          {err}
        </div>
      )}

      {/* ── Order header ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
          Order Details
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* Row 1: DI No. | Customer Name */}
          <div style={{ minWidth: 0 }}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">DI No. *</label>
            <input
              value={hdr.diNo || ""}
              onChange={(e) => setH("diNo", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="e.g. DVS/SO-25-001"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name *</label>
            <CustomerNamePicker
              value={hdr.customerName}
              profiles={profiles}
              onSelect={(name, company, orderType) => {
                setH("customerName", name);
                if (company) setH("company", company);
                if (orderType) setH("orderType", orderType);
              }}
            />
            {hdr.customerName &&
              profiles.find((p) => p.customerName === hdr.customerName.toUpperCase()) && (
                <p className="mt-1 text-xs text-green-600">Auto-filled from memory</p>
              )}
          </div>

          {/* Row 2: Order Type | Company */}
          <div style={{ minWidth: 0 }}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Type</label>
            <select
              value={hdr.orderType}
              onChange={(e) => setH("orderType", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {ORDER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Company</label>
            <select
              value={hdr.company}
              onChange={(e) => setH("company", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Row 3: Sales Staff | Order Date */}
          <div style={{ minWidth: 0 }}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sales Staff</label>
            <input
              value={hdr.salesStaff || ""}
              onChange={(e) => setH("salesStaff", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Name of sales person"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Date</label>
            <input
              type="date"
              value={hdr.orderReceivedDate}
              onChange={(e) => setH("orderReceivedDate", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          {/* Row 4: Remarks — full width */}
          <div style={{ minWidth: 0, gridColumn: "1 / -1" }}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Remarks</label>
            <input
              value={hdr.remarks || ""}
              onChange={(e) => setH("remarks", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Special instructions, delivery notes…"
            />
          </div>
        </div>

        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
          <span>ℹ</span>
          <span>
            Invoice, batch details and dispatch info are filled in the{" "}
            <strong>Dispatch</strong> tab once the order reaches the inventory
            team.
          </span>
        </div>
      </div>

      {/* ── Product lines ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Product Lines
          </h3>
          <button
            type="button"
            onClick={() => setItems((it) => [...it, { ...BLANK_ITEM }])}
            className="text-sm text-green-700 font-semibold hover:underline"
          >
            + Add Line
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <LineItemRow
              key={idx}
              item={item}
              idx={idx}
              products={products}
              cpProfiles={cpProfiles}
              onChange={(i, u) =>
                setItems((it) => it.map((x, j) => (j === i ? u : x)))
              }
              onRemove={(i) => setItems((it) => it.filter((_, j) => j !== i))}
              onProductPicked={applyProductMemory}
              onCpProductPicked={applyCpProductMemory}
            />
          ))}
        </div>
      </div>

      {/* ── Submit / Cancel ───────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
          style={{ background: BRAND }}
        >
          {saving
            ? "Saving…"
            : initial?.id
              ? "Update Order"
              : "Create Sales Order"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
