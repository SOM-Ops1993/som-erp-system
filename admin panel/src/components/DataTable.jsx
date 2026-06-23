const STATUS_COLORS = {
  ACTIVE:           { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  EXHAUSTED:        { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  COMPLETED:        { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  CANCELLED:        { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
  AWAITING_INWARD:  { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  INWARDED:         { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  PENDING:          { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  RESERVED:         { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  PACK:             { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  BULK:             { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  IN:               { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  OUT:              { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  ADJUSTMENT:       { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
};

function StatusBadge({ value }) {
  const style = STATUS_COLORS[value];
  if (!style) return <span className="text-muted">{value}</span>;
  return (
    <span
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: 6,
        fontSize: '0.73rem',
        fontWeight: 600,
        padding: '2px 8px',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  );
}

function CellValue({ value, fieldName }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted">—</span>;
  if (Array.isArray(value)) return <span className="font-monospace" style={{ fontSize: '0.8rem' }}>{value.join(', ')}</span>;
  if (typeof value === 'boolean') return value ? <StatusBadge value="Yes" /> : <span className="text-muted">No</span>;
  if (
    fieldName?.toLowerCase().includes('status') ||
    fieldName?.toLowerCase().includes('type') ||
    fieldName?.toLowerCase().includes('tracking')
  ) {
    return <StatusBadge value={String(value)} />;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return <span style={{ fontSize: '0.82rem', color: '#475467' }}>{new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
  }
  const str = String(value);
  const truncated = str.length > 28 ? str.slice(0, 26) + '…' : str;
  return <span title={str.length > 28 ? str : undefined}>{truncated}</span>;
}

function getRowKey(record, resource, fallback) {
  if (Array.isArray(resource.idField)) {
    return resource.idField.map((f) => record[f]).join('-') || fallback;
  }
  return record[resource.idField] || fallback;
}

// Show first 5 fields as preview columns; rest visible in the drawer
const MAX_PREVIEW = 5;

export default function DataTable({ resource, records, loading, onRowClick, onEdit, onDelete }) {
  const previewFields = resource.fields.slice(0, MAX_PREVIEW);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner-border spinner-border-sm text-secondary me-2" role="status" />
        Loading records…
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="empty-state">
        <svg width="40" height="40" fill="none" stroke="#bdc7d4" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <div>No records found.</div>
      </div>
    );
  }

  return (
    <div className="data-table-wrap">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            {previewFields.map((f) => (
              <th key={f.name}>{f.label}</th>
            ))}
            {resource.fields.length > MAX_PREVIEW && (
              <th style={{ color: '#9aa9bd', fontStyle: 'italic', fontWeight: 400 }}>
                +{resource.fields.length - MAX_PREVIEW} more
              </th>
            )}
            <th className="text-end" style={{ width: 110 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr
              key={getRowKey(record, resource, index)}
              className="table-row-clickable"
              onClick={() => onRowClick(record)}
              title="Click to view full record"
            >
              {previewFields.map((f) => (
                <td key={f.name}>
                  <CellValue value={record[f.name]} fieldName={f.name} />
                </td>
              ))}
              {resource.fields.length > MAX_PREVIEW && (
                <td>
                  <span style={{ color: '#9aa9bd', fontSize: '0.8rem' }}>View all →</span>
                </td>
              )}
              <td className="text-end action-cell" onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => onEdit(record)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(record)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
