import { useEffect } from 'react';

const STATUS_COLORS = {
  ACTIVE:          { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  EXHAUSTED:       { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  COMPLETED:       { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  CANCELLED:       { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
  AWAITING_INWARD: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  INWARDED:        { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  PENDING:         { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  RESERVED:        { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  PACK:            { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  BULK:            { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  IN:              { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  OUT:             { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  ADJUSTMENT:      { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
};

function renderValue(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return <span style={{ color: '#9aa9bd', fontStyle: 'italic' }}>empty</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {value.map((v, i) => (
          <span key={i} style={{ background: '#f3f4f6', borderRadius: 4, padding: '1px 7px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            {String(v)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span style={{
        background: value ? '#ecfdf5' : '#f9fafb',
        color: value ? '#059669' : '#6b7280',
        border: `1px solid ${value ? '#a7f3d0' : '#e5e7eb'}`,
        borderRadius: 6,
        fontSize: '0.78rem',
        fontWeight: 600,
        padding: '2px 10px',
      }}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  // Status/type badge
  if (
    fieldName?.toLowerCase().includes('status') ||
    fieldName?.toLowerCase().includes('type') ||
    fieldName?.toLowerCase().includes('tracking')
  ) {
    const style = STATUS_COLORS[String(value)];
    if (style) {
      return (
        <span style={{
          background: style.bg,
          color: style.text,
          border: `1px solid ${style.border}`,
          borderRadius: 6,
          fontSize: '0.78rem',
          fontWeight: 600,
          padding: '2px 10px',
        }}>
          {String(value)}
        </span>
      );
    }
  }

  // Date/time
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    return (
      <span>
        {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        {' '}
        <span style={{ color: '#9aa9bd', fontSize: '0.82rem' }}>
          {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </span>
    );
  }

  // Long string — show as block
  const str = String(value);
  if (str.length > 60) {
    return (
      <span style={{
        display: 'block',
        fontFamily: 'monospace',
        fontSize: '0.82rem',
        wordBreak: 'break-all',
        background: '#f8fafc',
        borderRadius: 4,
        padding: '4px 8px',
      }}>
        {str}
      </span>
    );
  }

  return <span>{str}</span>;
}

export default function RowDetailDrawer({ resource, record, onClose, onEdit, onDelete }) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!record) return null;

  // Build display title from first meaningful text field
  const titleField = resource.fields.find((f) =>
    f.name.toLowerCase().includes('name') || f.name.toLowerCase().includes('id')
  );
  const title = titleField ? String(record[titleField.name] ?? '') : resource.title;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Drawer panel */}
      <div className="drawer-panel">
        {/* Header */}
        <div className="drawer-header">
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>{resource.model}</p>
            <h2 className="drawer-title">{title || resource.title}</h2>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
          />
        </div>

        {/* Fields */}
        <div className="drawer-body">
          {resource.fields.map((field) => (
            <div key={field.name} className="drawer-field">
              <div className="drawer-field-label">{field.label}</div>
              <div className="drawer-field-value">
                {renderValue(record[field.name], field.name)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="drawer-footer">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => { onClose(); onEdit(record); }}
          >
            Edit
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => { onClose(); onDelete(record); }}
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
