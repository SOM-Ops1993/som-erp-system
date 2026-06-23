/**
 * ERP Login Page — full password + PIN login tab
 */
import { useState } from 'react'
import { useAuth } from '../../components/erp/AuthContext.jsx'
import PINLogin from '../../components/erp/PINLogin.jsx'

export default function Login({ onLogin }) {
  const { login, loading } = useAuth()
  const [tab, setTab] = useState('password') // 'password' | 'pin'
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) { setError('Username and password required'); return }
    setError('')
    try {
      const user = await login(form.username, form.password)
      onLogin?.(user)
    } catch (e) {
      setError(e.message || 'Login failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '380px',
        padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>SOM PHYTOPHARMA</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.12em', fontWeight: 600, marginTop: '3px' }}>ERP — BIOFERTILIZER MANUFACTURING</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', marginBottom: '24px' }}>
          {['password', 'pin'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#1e293b' : '#94a3b8',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>
              {t === 'password' ? '🔑 Password' : '🔢 PIN Login'}
            </button>
          ))}
        </div>

        {tab === 'password' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>USERNAME</label>
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Enter username"
                autoFocus
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>PASSWORD</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter password"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            {error && <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#fef2f2', borderRadius: '7px', fontSize: '13px', color: '#dc2626' }}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', background: loading ? '#94a3b8' : '#1e3a5f', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em', transition: 'background 0.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <PINLogin onSuccess={onLogin} />
        )}

        <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
          All actions are logged in the audit trail.<br />Contact admin for access issues.
        </div>
      </div>
    </div>
  )
}
