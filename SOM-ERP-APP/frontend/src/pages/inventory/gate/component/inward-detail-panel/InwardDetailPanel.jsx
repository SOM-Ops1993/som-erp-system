import { IconButton } from "../../../../../components/ui";
import { X } from "lucide-react";
import "./InwardDetailPanel.css";

function StatusBadge({ status }) {
  return (
    <span className={`idp-badge idp-badge--${status || "pending"}`}>
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
    <div className="idp-wrap">
      <div className="idp-header">
        <div>
          <h3 className="idp-title">Inward Detail</h3>
          <p className="idp-sub">{supplierName}</p>
        </div>
        <IconButton icon={X} tooltip="Close" onClick={onClose} />
      </div>

      <div className="idp-grid">
        {[
          ["Supplier",   supplierName],
          ["Invoice No.", invoiceNo],
          ["Vehicle No.", vehicleNo],
          ["Date",       new Date(createdAt).toLocaleString("en-IN")],
          ["Status",     <StatusBadge status={status} />],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="idp-field-label">{label}</div>
            <div className="idp-field-value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
