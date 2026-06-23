import Pagination from '../../../../components/erp/Pagination.jsx'

const S = {
  card:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  input:     { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' },
  btnDanger: { padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' },
  btnEdit:   { padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer', marginRight: '6px' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:        { textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' },
  td:        { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a', verticalAlign: 'middle' },
  badge:     { display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: '#eff6ff', color: '#2563eb' },
}

export default function MicrobeList({ paginated, total, loading, search, page, limit, onSearch, onEdit, onDelete, onPageChange, onLimitChange }) {
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>{total} microbe(s) registered</span>
        <input
          placeholder="Search name or code…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{ ...S.input, width: '220px' }}
        />
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>Loading…</p>
      ) : total === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🦠</div>
          <p style={{ fontSize: '14px' }}>No microbes found. Add one or import from Excel.</p>
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              <th style={S.th}>Microbe Name</th>
              <th style={S.th}>Microbe Code</th>
              <th style={S.th}>Added</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((m, i) => (
              <tr key={m.microbe_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...S.td, color: '#94a3b8', width: '40px' }}>{i + 1}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{m.microbe_name}</td>
                <td style={S.td}><span style={S.badge}>{m.microbe_code}</span></td>
                <td style={{ ...S.td, color: '#94a3b8', fontSize: '12px' }}>
                  {new Date(m.created_at).toLocaleDateString('en-IN')}
                </td>
                <td style={S.td}>
                  <button style={S.btnEdit} onClick={() => onEdit(m)}>✏️ Edit</button>
                  <button style={S.btnDanger} onClick={() => onDelete(m.microbe_id, m.microbe_name)}>🗑 Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ padding: '8px 4px' }}>
        <Pagination page={page} total={total} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
