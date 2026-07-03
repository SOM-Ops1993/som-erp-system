/**
 * ERP Login Page — email + password
 */
import { useState } from 'react'
import { useAuth } from '../../components/auth/AuthContext.jsx'
import { Button } from '../../components/ui'
import './Login.css'

export default function Login({ onLogin }) {
  const { login, loading } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Email and password required'); return }
    setError('')
    try {
      const user = await login(form.email, form.password)
      onLogin?.(user)
    } catch (e) {
      setError(e.message || 'Login failed')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Wordmark */}
        <div className="login-wordmark">
          <div className="login-wordmark__name">SOM PHYTOPHARMA</div>
          <div className="login-wordmark__sub">ERP — BIOFERTILIZER MANUFACTURING</div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label className="login-label">EMAIL</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="e.g. gate@agrilife.com"
              autoFocus
              className="login-input"
            />
          </div>
          <div className="login-field login-field--last">
            <label className="login-label">PASSWORD</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Enter password"
              className="login-input"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            fullWidth
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="login-footer">
          All actions are logged in the audit trail.<br />Contact admin for access issues.
        </div>
      </div>
    </div>
  )
}
