import { useState } from "react";

const EMPTY = { receiver_name: "", invoice_no: "", vehicle_no: "" };

const INPUT = {
  padding: "9px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: "7px",
  fontSize: "13px",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.15s",
};

const LABEL = {
  fontSize: "11px",
  color: "#64748b",
  fontWeight: 700,
  display: "block",
  marginBottom: "5px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

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
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        border: "1.5px solid #f97316",
        padding: "20px 24px",
        marginBottom: "20px",
        boxShadow: "0 4px 16px rgba(249,115,22,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
        <span style={{ fontSize: "18px" }}>⬆</span>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
          New Gate Outward
        </h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label style={LABEL}>{label}</label>
            <input
              value={form[key]}
              onChange={set(key)}
              placeholder={placeholder}
              style={INPUT}
              onFocus={(e) => (e.target.style.borderColor = "#f97316")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleSubmit}
          style={{
            padding: "9px 22px",
            background: "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: "7px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Record Outward
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "9px 18px",
            background: "#f1f5f9",
            color: "#64748b",
            border: "1px solid #e2e8f0",
            borderRadius: "7px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
