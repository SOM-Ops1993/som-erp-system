import { useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "../../../../../components/ui";
import "./InwardForm.css";

const EMPTY = { supplier_name: "", invoice_no: "", vehicle_no: "" };

const FIELDS = [
  { key: "supplier_name", label: "Supplier Name *", placeholder: "Enter supplier name" },
  { key: "invoice_no", label: "Invoice No.", placeholder: "e.g. INV-2024-001" },
  { key: "vehicle_no", label: "Vehicle No.", placeholder: "e.g. MH-12-AB-1234" },
];

export default function InwardForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.supplier_name.trim()) return alert("Supplier name is required");
    await onSubmit(form);
    setForm(EMPTY);
  };

  return (
    <div className="if-wrap">
      <div className="if-header">
        <ArrowDown size={18} style={{ color: "#3b82f6", flexShrink: 0 }} />
        <h3 className="if-title">New Gate Inward</h3>
      </div>

      <div className="if-grid">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="if-label">{label}</label>
            <input
              value={form[key]}
              onChange={set(key)}
              placeholder={placeholder}
              className="if-input"
            />
          </div>
        ))}
      </div>

      <div className="if-actions">
        <Button variant="primary" onClick={handleSubmit}>
          Create Inward Entry
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
