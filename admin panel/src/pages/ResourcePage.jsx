import { useEffect, useMemo, useState } from 'react';
import DataFormModal from '../components/DataFormModal.jsx';
import DataTable from '../components/DataTable.jsx';
import RowDetailDrawer from '../components/RowDetailDrawer.jsx';
import { createRecord, deleteAllRecords, deleteRecord, getResourceUrl, listRecords, updateRecord } from '../api/http.js';

export default function ResourcePage({ resource }) {
  const [records, setRecords]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [query, setQuery]               = useState('');
  const [modalState, setModalState]     = useState(null);   // { mode: 'create'|'edit', record? }
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll]   = useState(false);

  const visibleRecords = useMemo(() => {
    if (!query.trim()) return records;
    const kw = query.toLowerCase();
    return records.filter((rec) =>
      resource.fields.some((f) => String(rec[f.name] ?? '').toLowerCase().includes(kw))
    );
  }, [query, records, resource.fields]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const result = await listRecords(resource);
      setRecords(result.data ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to load records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    setQuery('');
    setDrawerRecord(null);
  }, [resource.key]);

  async function handleSave(payload) {
    setSaving(true);
    setError('');
    try {
      if (modalState.mode === 'create') {
        await createRecord(resource, payload);
      } else {
        await updateRecord(resource, modalState.record, payload);
      }
      setModalState(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to save record.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    const confirmed = window.confirm(`Delete this ${resource.model} record? This cannot be undone.`);
    if (!confirmed) return;
    setError('');
    try {
      await deleteRecord(resource, record);
      setDrawerRecord(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to delete record.');
    }
  }

  async function handleDeleteAll() {
    setConfirmDeleteAll(false);
    setDeletingAll(true);
    setError('');
    try {
      await deleteAllRecords(resource);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to delete all records.');
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <p className="eyebrow">{resource.model}</p>
          <h2>
            {resource.title}
            {!loading && (
              <span className="record-count">{total.toLocaleString()}</span>
            )}
          </h2>
          <p className="text-muted mb-0">{resource.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => setModalState({ mode: 'create' })}
          >
            + Add Record
          </button>
          <button
            className="btn"
            disabled={deletingAll || total === 0}
            onClick={() => setConfirmDeleteAll(true)}
            style={{
              background: total === 0 ? '#f1f5f9' : '#fff1f2',
              color:      total === 0 ? '#94a3b8' : '#dc2626',
              border:     `1px solid ${total === 0 ? '#e2e8f0' : '#fecaca'}`,
              fontWeight: 600,
              cursor:     total === 0 || deletingAll ? 'not-allowed' : 'pointer',
              opacity:    deletingAll ? 0.6 : 1,
            }}
          >
            {deletingAll ? 'Deleting…' : '🗑 Delete All'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <svg className="search-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="form-control search-input"
            value={query}
            placeholder={`Search ${resource.fields.length} fields…`}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-outline-secondary" onClick={loadData}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Endpoint tag */}
      <div className="endpoint-line">
        <span>Endpoint</span>
        <code>{getResourceUrl(resource)}</code>
        {query && (
          <span style={{ marginLeft: 'auto', color: '#667085', fontSize: '0.82rem' }}>
            Showing {visibleRecords.length} of {records.length}
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      <DataTable
        resource={resource}
        records={visibleRecords}
        loading={loading}
        onRowClick={setDrawerRecord}
        onEdit={(rec) => setModalState({ mode: 'edit', record: rec })}
        onDelete={handleDelete}
      />

      {/* Row detail drawer */}
      {drawerRecord && (
        <RowDetailDrawer
          resource={resource}
          record={drawerRecord}
          onClose={() => setDrawerRecord(null)}
          onEdit={(rec) => setModalState({ mode: 'edit', record: rec })}
          onDelete={handleDelete}
        />
      )}

      {/* Create / Edit modal */}
      {modalState && (
        <DataFormModal
          mode={modalState.mode}
          resource={resource}
          record={modalState.record}
          onClose={() => setModalState(null)}
          onSubmit={handleSave}
          saving={saving}
        />
      )}

      {/* Delete All confirmation modal */}
      {confirmDeleteAll && (
        <div className="modal-backdrop-custom">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 36 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', textAlign: 'center', fontSize: '1.15rem' }}>
              Delete All Records?
            </h3>
            <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.9rem', margin: '0 0 24px' }}>
              This will permanently remove all{' '}
              <strong>{total.toLocaleString()}</strong> rows from{' '}
              <code style={{ background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 4 }}>
                {resource.path}
              </code>
              . This action <strong>cannot be undone</strong>.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setConfirmDeleteAll(false)}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleDeleteAll}
                style={{
                  background: '#dc2626', color: '#fff',
                  border: 'none', fontWeight: 600,
                }}
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
