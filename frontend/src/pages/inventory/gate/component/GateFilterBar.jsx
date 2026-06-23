const INPUT = {
  padding: "8px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: "7px",
  fontSize: "13px",
  background: "#fff",
  outline: "none",
  color: "#0f172a",
  width: "100%",
  boxSizing: "border-box",
};

const LABEL = {
  fontSize: "10px",
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: "4px",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending",  label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function hasActiveFilters(f) {
  return f.search || f.from_date || f.to_date || f.status || f.invoice_no;
}

export default function GateFilterBar({ tab, filters, onChange, onClear, total }) {
  const searchLabel = tab === "inward" ? "Supplier Name" : "Receiver Name";
  const active = hasActiveFilters(filters);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
        padding: "14px 18px",
        marginBottom: "16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Row 1: search + invoice + status */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.5fr 1.2fr",
          gap: "12px",
          marginBottom: "10px",
        }}
      >
        {/* Search */}
        <div>
          <label style={LABEL}>Search by {searchLabel}</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "14px",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              value={filters.search}
              onChange={(e) => onChange("search", e.target.value)}
              placeholder={`Search ${searchLabel.toLowerCase()}…`}
              style={{ ...INPUT, paddingLeft: "32px" }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
        </div>

        {/* Invoice No. */}
        <div>
          <label style={LABEL}>Invoice No.</label>
          <input
            value={filters.invoice_no}
            onChange={(e) => onChange("invoice_no", e.target.value)}
            placeholder="Search invoice no…"
            style={INPUT}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Status */}
        <div>
          <label style={LABEL}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => onChange("status", e.target.value)}
            style={{ ...INPUT, cursor: "pointer" }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: date range + summary + clear */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div style={{ flex: "0 0 auto", minWidth: "140px" }}>
          <label style={LABEL}>From Date</label>
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => onChange("from_date", e.target.value)}
            style={INPUT}
          />
        </div>

        <div style={{ flex: "0 0 auto", minWidth: "140px" }}>
          <label style={LABEL}>To Date</label>
          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => onChange("to_date", e.target.value)}
            style={INPUT}
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Results summary */}
        {total !== undefined && (
          <span
            style={{
              fontSize: "12px",
              color: active ? "#3b82f6" : "#94a3b8",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {total} {total === 1 ? "record" : "records"} found
          </span>
        )}

        {/* Clear button */}
        {active && (
          <button
            onClick={onClear}
            style={{
              padding: "7px 14px",
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {active && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          {filters.search && (
            <Chip label={`${searchLabel}: "${filters.search}"`} onRemove={() => onChange("search", "")} />
          )}
          {filters.invoice_no && (
            <Chip label={`Invoice: "${filters.invoice_no}"`} onRemove={() => onChange("invoice_no", "")} />
          )}
          {filters.status && (
            <Chip label={`Status: ${filters.status}`} onRemove={() => onChange("status", "")} />
          )}
          {filters.from_date && (
            <Chip label={`From: ${filters.from_date}`} onRemove={() => onChange("from_date", "")} />
          )}
          {filters.to_date && (
            <Chip label={`To: ${filters.to_date}`} onRemove={() => onChange("to_date", "")} />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        background: "#eff6ff",
        color: "#3b82f6",
        border: "1px solid #bfdbfe",
        borderRadius: "99px",
        fontSize: "11px",
        fontWeight: 600,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#93c5fd",
          fontSize: "12px",
          padding: "0",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        ✕
      </button>
    </span>
  );
}
