import { Button, IconButton } from "../../../../../components/ui";
import { X, Search } from "lucide-react";
import "./GateFilterBar.css";

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
    <div className="gfb-wrap">
      {/* Row 1: search + invoice + status */}
      <div className="gfb-row1">
        {/* Search */}
        <div>
          <label className="gfb-label">Search by {searchLabel}</label>
          <div className="gfb-search-wrap">
            <Search size={14} className="gfb-search-icon" />
            <input
              value={filters.search}
              onChange={(e) => onChange("search", e.target.value)}
              placeholder={`Search ${searchLabel.toLowerCase()}…`}
              className="gfb-input gfb-input--padded"
            />
          </div>
        </div>

        {/* Invoice No. */}
        <div>
          <label className="gfb-label">Invoice No.</label>
          <input
            value={filters.invoice_no}
            onChange={(e) => onChange("invoice_no", e.target.value)}
            placeholder="Search invoice no…"
            className="gfb-input"
          />
        </div>

        {/* Status */}
        <div>
          <label className="gfb-label">Status</label>
          <select
            value={filters.status}
            onChange={(e) => onChange("status", e.target.value)}
            className="gfb-input gfb-select"
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
      <div className="gfb-row2">
        <div className="gfb-date-col">
          <label className="gfb-label">From Date</label>
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => onChange("from_date", e.target.value)}
            className="gfb-input"
          />
        </div>

        <div className="gfb-date-col">
          <label className="gfb-label">To Date</label>
          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => onChange("to_date", e.target.value)}
            className="gfb-input"
          />
        </div>

        {/* Spacer */}
        <div className="gfb-spacer" />

        {/* Results summary */}
        {total !== undefined && (
          <span className={active ? "gfb-summary--active" : "gfb-summary--idle"}>
            {total} {total === 1 ? "record" : "records"} found
          </span>
        )}

        {/* Clear button */}
        {active && (
          <Button variant="danger" size="sm" onClick={onClear}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {active && (
        <div className="gfb-chips">
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
    <span className="gfb-chip">
      {label}
      <IconButton icon={X} size="xs" onClick={onRemove} className="text-blue-300 hover:text-blue-500" />
    </span>
  );
}
