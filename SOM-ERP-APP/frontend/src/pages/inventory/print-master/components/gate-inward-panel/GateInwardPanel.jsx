import { useState, useEffect } from "react";
import { gateApi } from "../../../../../api/inventory.js";
import { Button } from "../../../../../components/ui";
import { RefreshCw } from "lucide-react";

const STATUS_COLORS = {
  pending:  { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#f0fdf4", color: "#15803d" },
  rejected: { bg: "#fef2f2", color: "#dc2626" },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      padding: "2px 8px", background: s.bg, color: s.color,
      borderRadius: "99px", fontSize: "10px", fontWeight: 700,
      textTransform: "capitalize", flexShrink: 0,
    }}>
      {status}
    </span>
  );
}

export default function GateInwardPanel({ onSelect, selectedId, reloadTrigger }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await gateApi.inwardList({ limit: 50, status: "pending" });
      setRecords(res.data || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [reloadTrigger]);

  return (
    <div style={{
      background: "#fff", borderRadius: "12px",
      border: "1px solid #e2e8f0", padding: "20px",
      display: "flex", flexDirection: "column",
      minHeight: "400px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
            Incoming Gate Entries
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#94a3b8" }}>
            Click an entry to auto-fill invoice details in the form
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
      </div>

      {err && (
        <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "8px", padding: "8px 12px", background: "#fef2f2", borderRadius: "6px" }}>
          {err}
        </div>
      )}

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
          Loading…
        </div>
      ) : records.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🚪</div>
          <p style={{ fontSize: "13px", fontWeight: 600 }}>No gate entries yet</p>
          <p style={{ fontSize: "12px", marginTop: "4px" }}>Gate entries appear here once created</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {records.map((r) => {
            const isSelected = selectedId === r.inwardId;
            return (
              <button
                key={r.inwardId}
                type="button"
                onClick={() => onSelect(r)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "12px 14px",
                  background: isSelected ? "#eff6ff" : "#f8fafc",
                  border: `1.5px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`,
                  borderRadius: "9px", cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                  boxShadow: isSelected ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#93c5fd"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                {/* Row 1: supplier + status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                    {r.supplierName}
                  </span>
                  <StatusBadge status={r.status} />
                </div>

                {/* Row 2: meta */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11px", color: "#64748b" }}>
                  {r.invoiceNo && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      📄 {r.invoiceNo}
                    </span>
                  )}
                  {r.vehicleNo && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      🚛 {r.vehicleNo}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto" }}>{fmtDate(r.createdAt)}</span>
                </div>

                {isSelected && (
                  <div style={{ marginTop: "7px", fontSize: "11px", fontWeight: 600, color: "#3b82f6" }}>
                    ✓ Selected — invoice details auto-filled in the form
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
