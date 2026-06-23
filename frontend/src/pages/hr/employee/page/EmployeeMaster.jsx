import { useState, useEffect, useCallback } from 'react'
import { employeeApi } from '../../../../api/hr.js'
import BackButton from '../../../../components/erp/BackButton.jsx'
import Pagination from '../../../../components/erp/Pagination.jsx'

const ROLES = ['ADMIN', 'SALES', 'PRODUCTION', 'QC', 'DISPATCH', 'PLANNING', 'ACCOUNTS']
const SECTIONS = ['NANO', 'BOTANICAL', 'LIQUID', 'POWDER', 'GRANULES']
const ROLE_COLORS = {
  ADMIN:      'bg-red-100 text-red-700',
  SALES:      'bg-blue-100 text-blue-700',
  PRODUCTION: 'bg-amber-100 text-amber-700',
  QC:         'bg-purple-100 text-purple-700',
  DISPATCH:   'bg-teal-100 text-teal-700',
  PLANNING:   'bg-indigo-100 text-indigo-700',
  ACCOUNTS:   'bg-green-100 text-green-700',
}
const PAGE_GROUPS = ['Masters', 'Warehouse', 'Production', 'Sales', 'Planning', 'Admin']

function Badge({ text, color }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{text}</span>
}

function EmployeeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'PRODUCTION', section: '', ...initial })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setErr('Name is required')
    setSaving(true); setErr('')
    try { await onSave(form) } catch (ex) { setErr(ex.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g. Suresh Kumar" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Role *</label>
          <select value={form.role} onChange={e => set('role', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="optional" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="optional" />
        </div>
        {form.role === 'PRODUCTION' && (
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Assigned Section</label>
            <select value={form.section} onChange={e => set('section', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">— Select section —</option>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : initial?.id ? 'Update Employee' : 'Add Employee'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

function PermissionsTab({ pages, defaults }) {
  const [selectedRole, setSelectedRole] = useState('SALES')
  const [perms, setPerms] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (perms[selectedRole] !== undefined) return
    employeeApi.getPermissions(selectedRole).then(res => {
      setPerms(p => ({ ...p, [selectedRole]: new Set(res.data.map(r => r.pagePath)) }))
    })
  }, [selectedRole])

  function toggle(path) {
    setPerms(p => {
      const s = new Set(p[selectedRole] || [])
      s.has(path) ? s.delete(path) : s.add(path)
      return { ...p, [selectedRole]: s }
    })
  }

  async function save() {
    setSaving(true); setMsg('')
    try {
      await employeeApi.savePermissions(selectedRole, [...(perms[selectedRole] || [])])
      setMsg('Saved!'); setTimeout(() => setMsg(''), 2000)
    } catch (ex) { setMsg(ex.message) }
    finally { setSaving(false) }
  }

  const current = perms[selectedRole] || new Set()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => (
          <button key={r} onClick={() => setSelectedRole(r)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${selectedRole === r ? ROLE_COLORS[r] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r}
          </button>
        ))}
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {PAGE_GROUPS.map(group => {
          const groupPages = pages.filter(p => p.group === group)
          if (!groupPages.length) return null
          return (
            <div key={group} className="border-b border-gray-100 last:border-0">
              <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{group}</div>
              <div className="px-4 py-2 flex flex-wrap gap-3">
                {groupPages.map(p => (
                  <label key={p.path} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={current.has(p.path)} onChange={() => toggle(p.path)} className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-sm text-gray-700">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 items-center">
        <button onClick={save} disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
        <button onClick={() => setPerms(p => ({ ...p, [selectedRole]: new Set(defaults[selectedRole] || []) }))}
          className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          Reset to Default
        </button>
        {msg && <span className="text-sm text-green-600 font-semibold">{msg}</span>}
      </div>
    </div>
  )
}

function CompanyTab() {
  const [companies, setCompanies] = useState([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => { const res = await employeeApi.listCompanies(); setCompanies(res.data) }, [])
  useEffect(() => { load() }, [load])

  async function add(e) {
    e.preventDefault()
    if (!code || !name) return
    setSaving(true)
    try { await employeeApi.addCompany({ code, name }); setCode(''); setName(''); load() }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">These company codes appear in the Sales Order "Company" dropdown.</p>
      <div className="flex flex-wrap gap-3">
        {companies.map(c => (
          <div key={c.code} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <span className="font-bold text-sm text-gray-800">{c.code}</span>
            <span className="text-xs text-gray-500">{c.name}</span>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Code</label>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. AL-PTE" maxLength={12}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Agrilife PTE Ltd"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <button type="submit" disabled={saving || !code || !name}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
          {saving ? '…' : '+ Add'}
        </button>
      </form>
    </div>
  )
}

export default function EmployeeMaster() {
  const [employees, setEmployees] = useState([])
  const [pages, setPages]         = useState([])
  const [defaults, setDefaults]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('employees')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [filterRole, setFilterRole] = useState('ALL')
  const [err, setErr]             = useState('')
  const [page, setPage]           = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [empRes, pageRes, defRes] = await Promise.all([employeeApi.list(), employeeApi.listPages(), employeeApi.roleDefaults()])
      setEmployees(empRes.data); setPages(pageRes.data); setDefaults(defRes.data)
    } catch (ex) { setErr(ex.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form) {
    if (editing) await employeeApi.update(editing.id, form)
    else await employeeApi.create(form)
    setShowForm(false); setEditing(null); load()
  }

  async function handleDelete(emp) {
    if (!confirm(`Deactivate ${emp.name}?`)) return
    await employeeApi.remove(emp.id); load()
  }

  const filtered = filterRole === 'ALL' ? employees : employees.filter(e => e.role === filterRole)
  const activeCount = employees.filter(e => e.isActive).length
  const [limit, setLimit] = useState(15)
  const activeFiltered = filtered.filter(e => e.isActive)
  const paginatedEmployees = activeFiltered.slice((page - 1) * limit, page * limit)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Master</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeCount} active employees · Role-based access control</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            + Add Employee
          </button>
          <BackButton />
        </div>
      </div>

      {err && <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{err}</div>}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-4">{editing ? `Edit — ${editing.name}` : 'New Employee'}</h2>
          <EmployeeForm initial={editing || {}} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null) }} />
        </div>
      )}

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ key: 'employees', label: '👤 Employees' }, { key: 'permissions', label: '🔒 Role Permissions' }, { key: 'companies', label: '🏢 Companies' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setFilterRole('ALL'); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${filterRole === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              All ({employees.filter(e => e.isActive).length})
            </button>
            {ROLES.map(r => {
              const cnt = employees.filter(e => e.role === r && e.isActive).length
              if (!cnt) return null
              return (
                <button key={r} onClick={() => { setFilterRole(r); setPage(1) }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${filterRole === r ? ROLE_COLORS[r] : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {r} ({cnt})
                </button>
              )
            })}
          </div>
          {loading ? <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
          : filtered.filter(e => e.isActive).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">👤</div>
              <p>No employees yet. Click "+ Add Employee" to get started.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Code','Name','Role','Section','Contact',''].map((h, i) => (
                      <th key={i} className={`${h ? 'text-left' : ''} px-4 py-3 text-xs font-semibold text-gray-500`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{emp.empCode}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{emp.name}</td>
                      <td className="px-4 py-3"><Badge text={emp.role} color={ROLE_COLORS[emp.role] || 'bg-gray-100 text-gray-600'} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{emp.section || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {emp.email && <div>{emp.email}</div>}
                        {emp.phone && <div>{emp.phone}</div>}
                        {!emp.email && !emp.phone && '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setEditing(emp); setShowForm(true) }} className="text-xs text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(emp)} className="text-xs text-red-400 hover:underline">Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 pb-3">
                <Pagination page={page} total={activeFiltered.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'permissions' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-gray-800 mb-1">Role → Page Access</h2>
          <p className="text-sm text-gray-500 mb-5">Check the pages each role is allowed to see. Changes apply to all employees with that role.</p>
          <PermissionsTab pages={pages} defaults={defaults} />
        </div>
      )}

      {tab === 'companies' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-gray-800 mb-1">Group Companies</h2>
          <CompanyTab />
        </div>
      )}
    </div>
  )
}
