import { useState, useEffect } from 'react'
import { microbialSfgApi } from '../../../../api/microbial.js'
import MicrobeList   from '../components/MicrobeList.jsx'
import MicrobeForm   from '../components/MicrobeForm.jsx'
import MicrobeImport from '../components/MicrobeImport.jsx'

const S = {
  page:       { padding: '24px', fontFamily: "'Inter',system-ui,sans-serif", maxWidth: '960px' },
  head:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  h1:         { fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 },
  sub:        { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  btnPrimary: { padding: '9px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
  btnOutline: { padding: '8px 16px', background: '#fff', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: '7px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
}

export default function MicrobesMaster() {
  const [microbes, setMicrobes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('list')
  const [form, setForm]         = useState({ microbe_name: '', microbe_code: '' })
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

  const load = async () => {
    setLoading(true)
    try {
      const res = await microbialSfgApi.listMicrobes()
      setMicrobes(res?.data || [])
    } catch { /* silent */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) await microbialSfgApi.updateMicrobe(editId, form)
      else        await microbialSfgApi.createMicrobe(form)
      setForm({ microbe_name: '', microbe_code: '' })
      setEditId(null)
      setTab('list')
      await load()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  const handleEdit = (m) => {
    setForm({ microbe_name: m.microbe_name, microbe_code: m.microbe_code })
    setEditId(m.microbe_id)
    setTab('add')
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    await microbialSfgApi.deleteMicrobe(id)
    await load()
  }

  const filtered  = microbes.filter(m =>
    m.microbe_name.toLowerCase().includes(search.toLowerCase()) ||
    m.microbe_code.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>🦠 Microbes Master</h1>
          <p style={S.sub}>Manage microbe names and codes used across the SFG module</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={S.btnOutline} onClick={() => setTab('import')}>⇪ Import Excel</button>
          <button style={S.btnPrimary} onClick={() => { setForm({ microbe_name: '', microbe_code: '' }); setEditId(null); setTab('add') }}>
            + Add Microbe
          </button>
          <button
            onClick={() => window.history.back()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', fontSize: '13px', fontWeight: 500, color: '#475569', cursor: 'pointer' }}
          >← Back</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {[
          ['list',   '📋 Microbe List'],
          ['add',    editId ? '✏️ Edit Microbe' : '+ Add Microbe'],
          ['import', '⇪ Import from Excel'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 18px', borderRadius: '8px 8px 0 0', fontSize: '13px', fontWeight: 600,
            border: '1px solid #e2e8f0', borderBottom: tab === k ? '2px solid #1e3a5f' : '1px solid #e2e8f0',
            background: tab === k ? '#fff' : '#f8fafc', color: tab === k ? '#1e3a5f' : '#64748b', cursor: 'pointer',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'list' && (
        <MicrobeList
          paginated={paginated}
          total={filtered.length}
          loading={loading}
          search={search}
          page={page}
          limit={limit}
          onSearch={v => { setSearch(v); setPage(1) }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      )}

      {tab === 'add' && (
        <MicrobeForm
          editId={editId}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => { setTab('list'); setEditId(null); setForm({ microbe_name: '', microbe_code: '' }) }}
        />
      )}

      {tab === 'import' && (
        <MicrobeImport onImportDone={load} />
      )}
    </div>
  )
}
