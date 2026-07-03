import { useState } from "react";
import { salesOrderApi } from "../../../../../api/sales.js";
import {
  BRAND,
  LABEL_TYPES,
  STATUS_STYLE,
  STATUS_LABELS,
} from "../../shared/constants.js";
import { Button, IconButton } from "../../../../../components/ui";
import { X, Trash2, Truck } from "lucide-react";

// Statuses that can be dispatched right now
const DISPATCHABLE = ["IN_INVENTORY", "READY_TO_DISPATCH", "PACKED"];

export default function DispatchOrder({ order, onSave, onDelete, onClose }) {
  const today = new Date().toISOString().split("T")[0];

  const [saving, setSaving] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState(order.invoiceNo || "");
  const [transportName, setTransportName] = useState(order.transportName || "");
  const [dispatchedBy, setDispatchedBy] = useState(order.dispatchedBy || "");
  const [remarks, setRemarks] = useState(order.remarks || "");
  const [partialToggles, setPartialToggles] = useState({});
  const [partialQty, setPartialQty] = useState({});

  // ── Determine overall status for the header badge ─────────────────────────
  const dominantStatus = order.items.every((it) => it.status === "DISPATCHED")
    ? "DISPATCHED"
    : order.items.find((it) =>
        ["READY_TO_DISPATCH", "IN_INVENTORY", "PACKED"].includes(it.status),
      )?.status ||
      order.items[0]?.status ||
      "PENDING";

  const isAlreadyDispatched = dominantStatus === "DISPATCHED";

  // ── Normalise line data ───────────────────────────────────────────────────
  const lines = order.items.map((it) => ({
    id: it.id,
    productName: it.inhouseProductName || it.customerProductName,
    totalQty: it.totalQty,
    totalUom: it.totalUom || "KG",
    batchNo: it.batchNo || "—",
    mrp: it.mrp || "—",
    mfgDate: it.mfgDate
      ? new Date(it.mfgDate).toLocaleDateString("en-IN")
      : "—",
    expDate: it.expDate
      ? new Date(it.expDate).toLocaleDateString("en-IN")
      : "—",
    primaryPack: it.unitPackType || "—",
    secondaryPack: it.packingType || "—",
    noOfUnits: it.unitQty ? `${it.unitQty} ${it.unitUom || "KG"}` : "—",
    noOfSecPacks: it.totalCS || "—",
    labelType: it.labelType
      ? LABEL_TYPES.find((l) => l.value === it.labelType)?.label || it.labelType
      : "—",
    currentStatus: it.status,
    totalCSNum: parseInt(it.totalCS) || 0,
    canDispatch: DISPATCHABLE.includes(it.status),
  }));

  // Split into dispatchable vs. blocked
  const readyLines   = lines.filter((l) => l.canDispatch);
  const blockedLines = lines.filter((l) => !l.canDispatch);
  const hasMixed     = readyLines.length > 0 && blockedLines.length > 0;

  // ── Mark as dispatched ────────────────────────────────────────────────────
  async function markDispatched() {
    setSaving(true);
    try {
      await salesOrderApi.patchDispatch(order.id, {
        invoiceNo,
        transportName,
        dispatchedBy,
        remarks,
        invoiceDate: today,
      });
      // Only dispatch lines that are ready — skip PLANNED, PENDING, IN_PRODUCTION, etc.
      for (const line of readyLines) {
        if (partialToggles[line.id]) {
          const dispatched = parseInt(partialQty[line.id] || 0);
          const isFullyDispatched =
            dispatched >= line.totalCSNum && line.totalCSNum > 0;
          await salesOrderApi.updateItem(line.id, {
            status: isFullyDispatched ? "DISPATCHED" : line.currentStatus,
          });
        } else {
          await salesOrderApi.updateItem(line.id, { status: "DISPATCHED" });
        }
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  const inp =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl text-white"
          style={{ background: BRAND }}
        >
          <div>
            <h2 className="font-bold text-sm tracking-wide">
              {order.customerName} — {order.company}
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              {order.items.length} product line
              {order.items.length !== 1 ? "s" : ""}
              {hasMixed && (
                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full">
                  {readyLines.length} ready · {blockedLines.length} pending production
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLE[dominantStatus] || "bg-gray-100 text-gray-500"}`}
            >
              {STATUS_LABELS[dominantStatus] || dominantStatus}
            </span>
            <IconButton icon={X} tooltip="Close" variant="ghost" onClick={onClose} className="text-white/70 hover:text-white" />
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Mixed-status notice */}
          {hasMixed && !isAlreadyDispatched && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Partial dispatch — {readyLines.length} of {lines.length} items ready</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Items in <strong>Inventory</strong> status will be dispatched now.
                  Items still in production (Planned / In Production) will remain unchanged
                  and can be dispatched in a separate dispatch once ready.
                </p>
              </div>
            </div>
          )}

          {/* Production details — read only */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Production Details — Verification
              </p>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                Read Only
              </span>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div
                  key={line.id}
                  className={`border rounded-xl overflow-hidden ${
                    line.canDispatch
                      ? "border-gray-200 bg-gray-50"
                      : "border-gray-200 bg-gray-50/50 opacity-75"
                  }`}
                >
                  {/* Line header */}
                  <div
                    className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: line.canDispatch ? "#f0fdf4" : "#f8fafc" }}
                  >
                    <div className="flex items-center gap-2">
                      <p
                        className="text-sm font-bold"
                        style={{ color: line.canDispatch ? BRAND : "#64748b" }}
                      >
                        Line {idx + 1}: {line.productName}
                      </p>
                      {!line.canDispatch && (
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
                          🔒 Cannot dispatch
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[line.currentStatus] || "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUS_LABELS[line.currentStatus] || line.currentStatus}
                    </span>
                  </div>

                  {/* Production detail grid */}
                  <div className="p-4 grid grid-cols-5 gap-3">
                    {[
                      ["Total Qty", `${line.totalQty} ${line.totalUom}`, true],
                      ["Batch No.", line.batchNo, true],
                      ["MRP", line.mrp, false],
                      ["Mfg. Date", line.mfgDate, false],
                      ["Exp. Date", line.expDate, false],
                      ["Primary Pack", line.primaryPack, false],
                      ["Secondary Pack", line.secondaryPack, false],
                      ["Unit Per Sec. Pack", line.noOfUnits, false],
                      ["No. of Sec. Packs", line.noOfSecPacks, true],
                      ["Label Type", line.labelType, false],
                    ].map(([label, val, bold]) => (
                      <div key={label}>
                        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                        <p
                          className={`text-sm ${bold ? "font-bold text-gray-800" : "text-gray-700"}`}
                        >
                          {val}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Bottom section — partial dispatch toggle OR blocked notice */}
                  {!isAlreadyDispatched && (
                    line.canDispatch ? (
                      <div className="px-4 pb-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={!!partialToggles[line.id]}
                              onChange={(e) =>
                                setPartialToggles((t) => ({
                                  ...t,
                                  [line.id]: e.target.checked,
                                }))
                              }
                            />
                            <div
                              className={`w-9 h-5 rounded-full transition-colors ${partialToggles[line.id] ? "bg-green-500" : "bg-gray-300"}`}
                            />
                            <div
                              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${partialToggles[line.id] ? "translate-x-4" : ""}`}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">
                            Partial Dispatch
                          </span>
                        </label>

                        {partialToggles[line.id] && (
                          <div className="mt-2 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <label className="text-xs text-amber-800 font-semibold whitespace-nowrap">
                              Sec. Packs Dispatching Now:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={line.totalCSNum || 9999}
                              value={partialQty[line.id] || ""}
                              onChange={(e) =>
                                setPartialQty((q) => ({
                                  ...q,
                                  [line.id]: e.target.value,
                                }))
                              }
                              className="w-24 border border-amber-300 rounded-lg px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                              placeholder="0"
                            />
                            {line.totalCSNum > 0 && partialQty[line.id] && (
                              <span className="text-xs text-amber-700">
                                of {line.totalCSNum} total
                                {parseInt(partialQty[line.id] || 0) >= line.totalCSNum
                                  ? " — full dispatch ✓"
                                  : ` — ${line.totalCSNum - parseInt(partialQty[line.id] || 0)} remaining`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 pb-4">
                        <p className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                          This item is <strong className="text-gray-500">{STATUS_LABELS[line.currentStatus] || line.currentStatus}</strong> — it will go to production first and can be dispatched separately once ready.
                        </p>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dispatch entry fields */}
          {!isAlreadyDispatched && readyLines.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                Dispatch Entry
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Invoice No.
                  </label>
                  <input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className={inp}
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Transport / Courier
                  </label>
                  <input
                    value={transportName}
                    onChange={(e) => setTransportName(e.target.value)}
                    className={inp}
                    placeholder="Truck / courier name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Dispatched By
                  </label>
                  <input
                    value={dispatchedBy}
                    onChange={(e) => setDispatchedBy(e.target.value)}
                    className={inp}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Remarks
                  </label>
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className={inp}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          )}

          {isAlreadyDispatched && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800 font-semibold text-center">
              ✅ This order has been dispatched.
              {order.invoiceNo && (
                <span className="ml-2 font-normal text-green-700">
                  Invoice: {order.invoiceNo}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => onDelete(order)}
          >
            Delete Order
          </Button>
          <div className="flex gap-3">
            {!isAlreadyDispatched && readyLines.length > 0 && (
              <Button
                variant="success"
                icon={Truck}
                loading={saving}
                disabled={saving}
                onClick={markDispatched}
              >
                {saving
                  ? "Processing…"
                  : hasMixed
                  ? `Dispatch ${readyLines.length} Ready Item${readyLines.length !== 1 ? "s" : ""}`
                  : "Mark as Dispatched"}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
