import { useState } from "react";
import Pagination from "../../../../../components/pagination/Pagination.jsx";
import { Button } from "../../../../../components/ui";

const TH = {
  padding: "11px 14px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

const STATUS_STYLE = {
  pending: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  approved: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  rejected: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span
      style={{
        padding: "3px 10px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: "99px",
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

const HEADERS = [
  "Supplier Name",
  "Invoice No.",
  "Vehicle No.",
  "Date & Time",
  "Status",
  "Actions",
];

function DeleteRequestBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fde68a",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      Delete Requested
    </span>
  );
}

export default function InwardTable({ list, total, onOpenDetail, onRequestDelete }) {
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);
  const paginated = list.slice((page - 1) * limit, page * limit);

  if (!list.length) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "10px", color: "#cbd5e1" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg></div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>
          No inward entries found
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
          Create a new inward entry to get started
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
          Inward Entries
        </span>
        <span
          style={{
            padding: "3px 10px",
            background: "#eff6ff",
            color: "#3b82f6",
            borderRadius: "99px",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          {total ?? list.length} records
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {HEADERS.map((h) => (
                <th key={h} style={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => (
              <tr
                key={item.inward_id || item.inwardId}
                style={{
                  borderTop: "1px solid #f1f5f9",
                  background: idx % 2 === 0 ? "#fff" : "#fafafa",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f0f9ff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    idx % 2 === 0 ? "#fff" : "#fafafa")
                }
              >
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1e293b",
                  }}
                >
                  {item.supplier_name || item.supplierName}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "13px",
                    color: "#475569",
                  }}
                >
                  {item.invoice_no || item.invoiceNo || "—"}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "13px",
                    color: "#475569",
                  }}
                >
                  {item.vehicle_no || item.vehicleNo || "—"}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {new Date(item.created_at || item.createdAt).toLocaleString(
                    "en-IN",
                  )}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <StatusBadge status={item.status} />
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onOpenDetail(item.inward_id || item.inwardId)}
                    >
                      Details
                    </Button>

                    {item.request_delete ? (
                      <DeleteRequestBadge />
                    ) : (
                      <Button
                        variant="warning"
                        size="xs"
                        onClick={() => onRequestDelete(item.inward_id || item.inwardId)}
                      >
                        Request Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "8px 16px" }}>
        <Pagination page={page} total={list.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>
    </div>
  );
}
