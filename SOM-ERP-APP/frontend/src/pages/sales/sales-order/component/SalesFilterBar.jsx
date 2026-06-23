import { COMPANIES, STATUSES, STATUS_LABELS } from "../shared/constants.js";

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
  ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

const COMPANY_OPTIONS = [
  { value: "", label: "All Companies" },
  ...COMPANIES.map((c) => ({ value: c, label: c })),
];

function hasActive(f) {
  return f.search || f.status || f.company || f.from_date || f.to_date;
}

export default function SalesFilterBar({ filters, onChange, onClear, total }) {
  const active = hasActive(filters);

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
      {/* Row 1: search + status + company */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.4fr 1.2fr",
          gap: "12px",
          marginBottom: "10px",
        }}
      >
        {/* Search */}
        <div>
          <label style={LABEL}>Search Customer / DI No.</label>
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
              placeholder="Customer name or DI No…"
              style={{ ...INPUT, paddingLeft: "32px" }}
              onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
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

        {/* Company */}
        <div>
          <label style={LABEL}>Company</label>
          <select
            value={filters.company}
            onChange={(e) => onChange("company", e.target.value)}
            style={{ ...INPUT, cursor: "pointer" }}
          >
            {COMPANY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: date range + count + clear */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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

        <div style={{ flex: 1 }} />

        {total !== undefined && (
          <span
            style={{
              fontSize: "12px",
              color: active ? "#16a34a" : "#94a3b8",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {total} {total === 1 ? "order" : "orders"} found
          </span>
        )}

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
            <Chip
              label={`Search: "${filters.search}"`}
              onRemove={() => onChange("search", "")}
            />
          )}
          {filters.status && (
            <Chip
              label={`Status: ${STATUS_LABELS[filters.status] || filters.status}`}
              onRemove={() => onChange("status", "")}
            />
          )}
          {filters.company && (
            <Chip
              label={`Company: ${filters.company}`}
              onRemove={() => onChange("company", "")}
            />
          )}
          {filters.from_date && (
            <Chip
              label={`From: ${filters.from_date}`}
              onRemove={() => onChange("from_date", "")}
            />
          )}
          {filters.to_date && (
            <Chip
              label={`To: ${filters.to_date}`}
              onRemove={() => onChange("to_date", "")}
            />
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
        background: "#f0fdf4",
        color: "#15803d",
        border: "1px solid #bbf7d0",
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
          color: "#86efac",
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
