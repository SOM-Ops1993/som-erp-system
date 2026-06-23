import { useState, useMemo, useEffect } from "react";
import { packsApi } from "../../../../api/inventory.js";
import { usePacks } from "../hooks/usePacks.js";
import Pagination from "../../../../components/erp/Pagination.jsx";

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_COLORS = {
  AWAITING_INWARD:  "bg-yellow-100 text-yellow-800",
  INWARDED:         "bg-blue-100 text-blue-800",
  PARTIALLY_ISSUED: "bg-orange-100 text-orange-800",
  EXHAUSTED:        "bg-gray-100 text-gray-500",
  MIXED:            "bg-purple-100 text-purple-700",
};
const statusColor = (s) => STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600";

function groupStatus(bags) {
  const counts = {};
  for (const b of bags) counts[b.status] = (counts[b.status] || 0) + 1;
  const keys = Object.keys(counts);
  if (keys.length === 1) return keys[0];
  // Priority ladder: AWAITING > PARTIALLY > INWARDED > EXHAUSTED
  if (counts.AWAITING_INWARD)  return 'AWAITING_INWARD';
  if (counts.PARTIALLY_ISSUED) return 'PARTIALLY_ISSUED';
  if (counts.INWARDED)         return 'INWARDED';
  return 'MIXED';
}

// ─── Group packs by itemCode + lotNo (matches batch-label endpoint) ───────────
function groupPacks(packs) {
  const map = new Map();
  for (const p of packs) {
    const key = `${p.itemCode}||${p.lotNo}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        itemCode:     p.itemCode,
        itemName:     p.itemName,
        lotNo:        p.lotNo,
        invoiceNo:    p.invoiceNo,
        supplier:     p.supplier,
        receivedDate: p.receivedDate,
        uom:          p.uom,
        bags:         [],
      });
    }
    map.get(key).bags.push(p);
  }
  // Sort bags within each group by bag number
  for (const g of map.values()) {
    g.bags.sort((a, b) => (a.bagNo || 0) - (b.bagNo || 0));
  }
  return Array.from(map.values());
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PackTable({ reloadTrigger }) {
  const [filterCode, setFilterCode]     = useState("");
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [page, setPage]                  = useState(1);
  const { packs, loading }              = usePacks(filterCode, reloadTrigger);

  const allGroups = useMemo(() => groupPacks(packs), [packs]);

  // A group is "pending" if at least one bag is still AWAITING_INWARD
  const pendingGroups   = useMemo(() => allGroups.filter(g => g.bags.some(b => b.status === 'AWAITING_INWARD')), [allGroups]);
  const completedGroups = useMemo(() => allGroups.filter(g => g.bags.every(b => b.status !== 'AWAITING_INWARD')), [allGroups]);
  const groups          = showCompleted ? allGroups : pendingGroups;

  const [limit, setLimit] = useState(15);
  const paginatedGroups = groups.slice((page - 1) * limit, page * limit);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, [showCompleted, filterCode]);

  const toggle = (key) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const expandAll  = () => setExpandedKeys(new Set(groups.map((g) => g.key)));
  const collapseAll = () => setExpandedKeys(new Set());

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Table header */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Pack Records</h2>
          {!loading && (
            <>
              {pendingGroups.length > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {pendingGroups.length} pending
                </span>
              )}
              {completedGroups.length > 0 && (
                <button
                  onClick={() => setShowCompleted(v => !v)}
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition ${
                    showCompleted
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {showCompleted ? '✓' : ''} {completedGroups.length} completed {showCompleted ? '(showing)' : '(hidden)'}
                </button>
              )}
              {pendingGroups.length === 0 && completedGroups.length === 0 && (
                <span className="text-xs text-gray-400">{allGroups.length} groups · {packs.length} bags</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 border border-indigo-200 rounded-lg hover:bg-indigo-50"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Collapse all
          </button>
          <input
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value)}
            placeholder="Filter by item code…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 py-8 text-center">Loading…</p>
      ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white text-xs">
              <tr>
                <th className="w-8 px-3 py-2.5" />
                <th className="text-left px-3 py-2.5 font-semibold">Item</th>
                <th className="text-left px-3 py-2.5 font-semibold">Lot / Invoice</th>
                <th className="text-left px-3 py-2.5 font-semibold">Supplier</th>
                <th className="text-center px-3 py-2.5 font-semibold">Bags</th>
                <th className="text-left px-3 py-2.5 font-semibold">Total Qty</th>
                <th className="text-left px-3 py-2.5 font-semibold">Received</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold">Print All QRs</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    {!showCompleted && completedGroups.length > 0
                      ? `All ${completedGroups.length} invoice(s) are fully scanned.`
                      : "No pack records found."}
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g) => {
                  const isOpen   = expandedKeys.has(g.key);
                  const totalQty = g.bags.reduce((s, b) => s + (b.packQty || 0), 0);
                  const status   = groupStatus(g.bags);

                  return (
                    <>
                      {/* ── Main group row ───────────────────────────────── */}
                      <tr
                        key={g.key}
                        onClick={() => toggle(g.key)}
                        className={`border-t border-gray-200 cursor-pointer select-none transition-colors ${
                          isOpen
                            ? "bg-indigo-50 hover:bg-indigo-100/60"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Expand toggle */}
                        <td className="px-3 py-3 text-center text-gray-400 text-xs">
                          {isOpen ? "▼" : "▶"}
                        </td>

                        {/* Item */}
                        <td className="px-3 py-3">
                          <div className="font-semibold text-gray-900">{g.itemName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{g.itemCode}</div>
                        </td>

                        {/* Lot / Invoice */}
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs font-semibold text-gray-700">
                            {g.lotNo || "—"}
                          </div>
                          {g.invoiceNo && (
                            <div className="text-xs text-gray-400 mt-0.5">Inv: {g.invoiceNo}</div>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="px-3 py-3 text-sm text-gray-600">
                          {g.supplier || "—"}
                        </td>

                        {/* Bags count */}
                        <td className="px-3 py-3 text-center">
                          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {g.bags.length}
                          </span>
                        </td>

                        {/* Total qty */}
                        <td className="px-3 py-3 font-semibold text-gray-800">
                          {totalQty % 1 === 0 ? totalQty : totalQty.toFixed(3)}{" "}
                          <span className="text-gray-400 font-normal text-xs">{g.uom}</span>
                        </td>

                        {/* Received date */}
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {g.receivedDate
                            ? new Date(g.receivedDate).toLocaleDateString("en-IN")
                            : "—"}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}>
                            {status.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Print all QRs */}
                        <td
                          className="px-3 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={packsApi.batchLabelsUrl(g.itemCode, g.lotNo)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition whitespace-nowrap"
                          >
                            🖨️ Print All ({g.bags.length})
                          </a>
                        </td>
                      </tr>

                      {/* ── Bag sub-rows (expanded) ──────────────────────── */}
                      {isOpen &&
                        g.bags.map((b, bi) => (
                          <tr
                            key={b.packId}
                            className="bg-indigo-50/30 border-t border-indigo-100/60"
                          >
                            <td colSpan={9} className="px-0 py-0">
                              <div className="flex items-center gap-0 pl-8 pr-3 py-2">
                                {/* Left accent line */}
                                <div className="w-px h-8 bg-indigo-300 mr-4 shrink-0" />

                                {/* Bag number */}
                                <span className="text-xs text-gray-400 w-16 shrink-0">
                                  Bag{" "}
                                  <span className="font-mono font-bold text-gray-700">
                                    #{String(b.bagNo).padStart(3, "0")}
                                  </span>
                                </span>

                                {/* Pack ID */}
                                <span className="font-mono text-xs text-blue-700 font-semibold flex-1 min-w-0 truncate mx-4">
                                  {b.packId}
                                </span>

                                {/* Qty */}
                                <span className="text-xs text-gray-700 w-20 shrink-0">
                                  {b.packQty} {b.uom}
                                </span>

                                {/* Status */}
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium w-36 text-center shrink-0 ${statusColor(b.status)}`}
                                >
                                  {b.status.replace(/_/g, " ")}
                                </span>

                                {/* Individual label */}
                                <a
                                  href={packsApi.labelUrl(b.packId)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-4 shrink-0 whitespace-nowrap"
                                >
                                  🖨️ Label
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-3">
          <Pagination page={page} total={groups.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
        </div>
        </>
      )}
    </div>
  );
}
