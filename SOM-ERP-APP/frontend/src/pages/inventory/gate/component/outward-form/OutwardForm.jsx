import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "../../../../../components/ui";
import "./OutwardForm.css";

const EMPTY = { receiver_name: "", invoice_no: "", vehicle_no: "" };

const FIELDS = [
  { key: "receiver_name", label: "Receiver Name", placeholder: "Person / company receiving goods" },
  { key: "invoice_no",    label: "Invoice No.",   placeholder: "e.g. INV-2024-001" },
  { key: "vehicle_no",    label: "Vehicle No.",   placeholder: "e.g. MH-12-AB-1234" },
];

export default function OutwardForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    await onSubmit(form);
    setForm(EMPTY);
  };

  return (
    <div className="of-wrap">
      <div className="of-header">
        <ArrowUp size={18} style={{ color: "#8b5cf6", flexShrink: 0 }} />
        <h3 className="of-title">New Gate Outward</h3>
      </div>

      <div className="of-grid">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="of-label">{label}</label>
            <input
              value={form[key]}
              onChange={set(key)}
              placeholder={placeholder}
              className="of-input"
            />
          </div>
        ))}
      </div>

      <div className="of-actions">
        <Button variant="warning" onClick={handleSubmit}>
          Record Outward
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
