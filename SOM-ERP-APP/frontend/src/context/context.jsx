import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE || '/api'

// ── Single API instance (attaches token when present) ─────────────────────────
export const api = axios.create({ baseURL: BASE, timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error'
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(new Error(message))
  }
)

// ── App Context ────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_user')) || null }
    catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('erp_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      setUser(res.user)
      return res.user
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setUser(null)
  }, [])

  // 'admin' operation is super-admin — always passes. Otherwise the user's
  // operation must match the one requested (e.g. a 'store' account can't
  // reach a 'gate'-only page).
  const canAccess = useCallback((operation) => {
    if (!operation) return true
    if (!user) return false
    return user.operation === 'admin' || user.operation === operation
  }, [user])

  const isAdmin      = useCallback(() => user?.operation === 'admin', [user])
  const isReadOnly    = user?.role === 'employee'
  // The old fine-grained role names (store_manager, plant_supervisor, qc_person...)
  // no longer exist — every call site used them to gate a mutating action behind
  // "is this a full-access account", which is exactly what user.role === 'admin'
  // means now. Arguments are accepted (and ignored) so existing call sites
  // (both hasRole(['a','b']) and hasRole('a','b') styles) keep working unchanged.
  const hasRole       = useCallback(() => user?.role === 'admin', [user])
  const canApprove    = useCallback(() => user?.role === 'admin', [user])
  const canPublish    = useCallback(() => user?.role === 'admin', [user])

  return (
    <AppContext.Provider value={{
      user, loading, login, logout,
      canAccess, isAdmin, isReadOnly, hasRole, canApprove, canPublish,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
