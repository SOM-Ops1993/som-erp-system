// Auth shim — re-exports from context for backward compatibility.
// RequireAuth is a no-op gate; access control will be enforced once RBAC is ready.
export { AppProvider as AuthProvider, useApp as useAuth } from '../../context/context.jsx'

export function RequireAuth({ children }) {
  return children
}
