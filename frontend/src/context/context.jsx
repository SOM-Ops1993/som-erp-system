import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE || '/api'

// ── Legacy API instance (no auth) ─────────────────────────────────────────────
export const api = axios.create({ baseURL: BASE, timeout: 30000 })

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

// ── ERP API instance (attaches token if present) ──────────────────────────────
export const erpApi = axios.create({ baseURL: BASE, timeout: 45000 })

erpApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

erpApi.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

// ── App Context (ready for future RBAC) ───────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_user')) || null }
    catch { return null }
  })

  // Kept for future RBAC — not enforced in routes yet
  const login = useCallback(async (username, password) => {
    const res = await erpApi.post('/auth/login', { username, password })
    localStorage.setItem('erp_token', res.token)
    localStorage.setItem('erp_user', JSON.stringify(res.user))
    setUser(res.user)
    return res.user
  }, [])

  const pinLogin = useCallback(async (username, pin) => {
    const res = await erpApi.post('/auth/pin-login', { username, pin })
    localStorage.setItem('erp_token', res.token)
    localStorage.setItem('erp_user', JSON.stringify(res.user))
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setUser(null)
  }, [])

  // Role helpers — always true for now; will enforce when RBAC is ready
  const hasRole = useCallback((..._roles) => true, [])
  const isAdmin = useCallback(() => true, [])
  const canApprove = useCallback(() => true, [])
  const canPublish = useCallback(() => true, [])

  return (
    <AppContext.Provider value={{ user, login, pinLogin, logout, hasRole, isAdmin, canApprove, canPublish }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
