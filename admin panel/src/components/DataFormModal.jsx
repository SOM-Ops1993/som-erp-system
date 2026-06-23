import { useEffect, useMemo, useState } from 'react';

function toInputValue(value, type) {
  if (value === null || value === undefined) return '';
  if (type === 'datetime-local') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  }
  if (type === 'date') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }
  if (type === 'tags') return Array.isArray(value) ? value.join(', ') : value;
  return value;
}

function normalizeValue(value, type) {
  if (value === '') return null;
  if (type === 'number') return Number(value);
  if (type === 'tags') {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (type === 'datetime-local') return new Date(value).toISOString();
  if (type === 'date') return new Date(`${value}T00:00:00`).toISOString();
  return value;
}

export default function DataFormModal({ mode, resource, record, onClose, onSubmit, saving }) {
  const editableFields = useMemo(
    () => resource.fields.filter((field) => !(mode === 'create' && field.readOnly)),
    [mode, resource.fields]
  );
  const [form, setForm] = useState({});

  useEffect(() => {
    const nextForm = {};
    editableFields.forEach((field) => {
      nextForm[field.name] = toInputValue(record?.[field.name], field.type);
    });
    setForm(nextForm);
  }, [editableFields, record]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {};
    editableFields.forEach((field) => {
      if (field.readOnly) return;
      payload[field.name] = normalizeValue(form[field.name], field.type);
    });
    onSubmit(payload);
  }

  return (
    <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header border-0 px-0 pt-0">
          <div>
            <h2 className="h5 mb-1">{mode === 'create' ? 'Add' : 'Edit'} {resource.title}</h2>
            <p className="text-muted mb-0">{resource.model}</p>
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            {editableFields.map((field) => (
              <div className={field.type === 'textarea' ? 'col-12' : 'col-md-6'} key={field.name}>
                <label className="form-label">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    className="form-select"
                    value={form[field.name] || ''}
                    disabled={field.readOnly}
                    onChange={(event) => updateField(field.name, event.target.value)}
                  >
                    <option value="">Select</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form[field.name] || ''}
                    disabled={field.readOnly}
                    onChange={(event) => updateField(field.name, event.target.value)}
                  />
                ) : (
                  <input
                    className="form-control"
                    type={field.type === 'tags' ? 'text' : field.type}
                    value={form[field.name] || ''}
                    disabled={field.readOnly}
                    step={field.type === 'number' ? 'any' : undefined}
                    placeholder={field.type === 'tags' ? 'Comma separated values' : undefined}
                    onChange={(event) => updateField(field.name, event.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
