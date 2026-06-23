const STATUS_STYLE = {
  pending:  { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  approved: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  rejected: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span
      style={{
        padding: "4px 12px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: "99px",
        fontSize: "12px",
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

export default function InwardDetailPanel({ detail, onClose }) {
  const d = detail;
  const supplierName = d.supplier_name || d.supplierName || "—";
  const invoiceNo    = d.invoice_no    || d.invoiceNo    || "—";
  const vehicleNo    = d.vehicle_no    || d.vehicleNo    || "—";
  const createdAt    = d.created_at    || d.createdAt;
  const status       = d.status        || "pending";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        border: "1.5px solid #6366f1",
        padding: "20px 24px",
        marginBottom: "20px",
        boxShadow: "0 4px 16px rgba(99,102,241,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
            Inward Detail
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#64748b" }}>
            {supplierName}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "#f1f5f9",
            border: "none",
            cursor: "pointer",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            fontSize: "16px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          padding: "16px",
          background: "#f8fafc",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        {[
          ["Supplier",   supplierName],
          ["Invoice No.", invoiceNo],
          ["Vehicle No.", vehicleNo],
          ["Date",       new Date(createdAt).toLocaleString("en-IN")],
          ["Status",     <StatusBadge status={status} />],
        ].map(([label, value]) => (
          <div key={label}>
            <div
              style={{
                fontSize: "10px",
                color: "#94a3b8",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
