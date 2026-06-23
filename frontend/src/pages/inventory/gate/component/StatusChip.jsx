const STATUS_COLORS = {
  pending_review: "#f59e0b",
  labels_generated: "#3b82f6",
  qr_pending: "#f97316",
  confirmed: "#16a34a",
  quarantine: "#dc2626",
};

const STATUS_LABELS = {
  pending_review: "Pending Review",
  labels_generated: "Labels Ready",
  qr_pending: "QR Pending",
  confirmed: "Confirmed",
  quarantine: "Quarantine",
};

export default function StatusChip({ status }) {
  const color = STATUS_COLORS[status] || "#94a3b8";
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "99px",
        fontSize: "11px",
        fontWeight: 700,
        background: color + "22",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
