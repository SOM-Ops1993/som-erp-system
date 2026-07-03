import { useState } from "react";
import { Button } from "../../../../../components/ui";

const INPUT = {
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  fontSize: "13px",
  width: "100%",
  boxSizing: "border-box",
};

export default function StoreConfirmForm({ detail, items, onConfirm }) {
  const [itemCode, setItemCode] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [itemFilter, setItemFilter] = useState("");

  const filtered = items
    .filter(
      (i) =>
        i.item_code.toLowerCase().includes(itemFilter.toLowerCase()) ||
        i.item_name.toLowerCase().includes(itemFilter.toLowerCase()),
    )
    .slice(0, 20);

  return (
    <div
      style={{
        padding: "16px",
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: "13px",
          marginBottom: "12px",
          color: "#15803d",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        Store: Confirm Item Details
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: 600,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Search & Select Item *
          </label>
          <input
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value)}
            placeholder="Type item name or code…"
            style={INPUT}
          />
          {itemFilter && (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                background: "#fff",
                maxHeight: "180px",
                overflowY: "auto",
                marginTop: "4px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              {filtered.map((item) => (
                <div
                  key={item.item_code}
                  onClick={() => {
                    setItemCode(item.item_code);
                    setItemFilter(`${item.item_name} (${item.item_code})`);
                  }}
                  style={{
                    padding: "9px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <span style={{ fontWeight: 700 }}>{item.item_code}</span> — {item.item_name}{" "}
                  <span style={{ color: "#94a3b8", fontSize: "11px" }}>({item.item_category})</span>
                </div>
              ))}
              {!filtered.length && (
                <div style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "12px" }}>
                  No items found
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: 600,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Unit Price (₹)
          </label>
          <input
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="Optional"
            style={INPUT}
          />
        </div>
      </div>

      <Button
        variant="success"
        disabled={!itemCode}
        onClick={() => itemCode && onConfirm(detail.inward_id, itemCode, unitPrice)}
      >
        Generate Labels &amp; Start QR Confirmation
      </Button>
    </div>
  );
}
