import { Save, X } from 'lucide-react'
import { Button } from '../../../../../components/ui'

const S = {
  card:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  label:  { display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input:  { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' },
}

export default function MicrobeForm({ editId, form, onChange, saving, onSubmit, onCancel }) {
  return (
    <div style={S.card}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '20px' }}>
        {editId ? '✏️ Edit Microbe' : '+ New Microbe'}
      </h3>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={S.label}>Microbe Name *</label>
            <input
              style={S.input}
              placeholder="e.g. Bacillus subtilis"
              value={form.microbe_name}
              onChange={e => onChange('microbe_name', e.target.value)}
              required
            />
          </div>
          <div>
            <label style={S.label}>Microbe Code *</label>
            <input
              style={{ ...S.input, textTransform: 'uppercase' }}
              placeholder="e.g. BS001"
              value={form.microbe_code}
              onChange={e => onChange('microbe_code', e.target.value.toUpperCase())}
              required
            />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Used to build container codes, e.g. BS001-BM-001
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button type="submit" variant="primary" icon={Save} disabled={saving} loading={saving}>
            {saving ? 'Saving…' : editId ? 'Update' : 'Add Microbe'}
          </Button>
          <Button type="button" variant="secondary" icon={X} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
