/**
 * PIN Login — shared shop-floor device PIN entry
 * Shows a numeric keypad for 4-digit PIN entry
 */
import { useState } from 'react'
import { useAuth } from './AuthContext.jsx'

export default function PINLogin({ onSuccess }) {
  const { pinLogin, loading } = useAuth()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const addDigit = (d) => {
    if (pin.length < 4) setPin(p => p + d)
  }
  const clear = () => setPin('')

  const submit = async () => {
    if (!username.trim()) { setError('Enter your username'); return }
    if (pin.length !== 4) { setError('Enter 4-digit PIN'); return }
    setError('')
    try {
      const user = await pinLogin(username.trim(), pin)
      onSuccess?.(user)
    } catch (e) {
      setError(e.message || 'Invalid credentials')
      setPin('')
    }
  }

  return (
    <div style={{ maxWidth: '300px', margin: '0 auto' }}>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Username</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter your username"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>

      {/* PIN display */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: '40px', height: '40px', border: '2px solid #3b82f6', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 700, background: pin.length > i ? '#3b82f6' : '#fff', color: pin.length > i ? '#fff' : '#3b82f6',
          }}>
            {pin.length > i ? '●' : ''}
          </div>
        ))}
      </div>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
          <button
            key={i}
            onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : d !== '' ? addDigit(String(d)) : null}
            disabled={d === ''}
            style={{
              padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '18px', fontWeight: d === '⌫' ? 400 : 600,
              background: d === '' ? 'transparent' : '#f8fafc', cursor: d === '' ? 'default' : 'pointer',
              color: '#1e293b', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (d !== '') e.target.style.background = '#e2e8f0' }}
            onMouseLeave={e => { if (d !== '') e.target.style.background = '#f8fafc' }}
          >
            {d}
          </button>
        ))}
      </div>

      {error && <div style={{ marginBottom: '10px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>{error}</div>}

      <button
        onClick={submit}
        disabled={loading || pin.length !== 4}
        style={{
          width: '100%', padding: '12px', background: pin.length === 4 ? '#3b82f6' : '#e2e8f0',
          color: pin.length === 4 ? '#fff' : '#94a3b8', border: 'none', borderRadius: '8px',
          fontSize: '15px', fontWeight: 700, cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s',
        }}
      >
        {loading ? 'Verifying…' : 'Login with PIN'}
      </button>
    </div>
  )
}
