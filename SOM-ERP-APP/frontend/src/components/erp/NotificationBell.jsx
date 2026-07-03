/**
 * NotificationBell — polls for unread count, shows dropdown list
 */
import { useState, useEffect, useRef } from 'react'
import { notifApi } from '../../api/notifications.js'
import { useAuth } from '../auth-context/AuthContext.jsx'

export default function NotificationBell() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef()

  // Poll every 60s
  useEffect(() => {
    if (!user) return
    const fetchCount = () => notifApi.unreadCount().then(r => setCount(r.count || 0)).catch(() => {})
    fetchCount()
    const timer = setInterval(fetchCount, 60000)
    return () => clearInterval(timer)
  }, [user])

  // Fetch full list on open
  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    notifApi.list({ unread_only: 'false', limit: 20 })
      .then(r => setNotifs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, user])

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!user) return null

  const markRead = async (id) => {
    await notifApi.markRead(id)
    setNotifs(n => n.map(x => x.notif_id === id ? { ...x, is_read: true } : x))
    setCount(c => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    await notifApi.markReadAll()
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
    setCount(0)
  }

  const typeColor = (type) => {
    if (type?.includes('unauthorised') || type?.includes('fifo')) return '#ef4444'
    if (type?.includes('pending') || type?.includes('overdue')) return '#f59e0b'
    if (type?.includes('publish') || type?.includes('bom')) return '#3b82f6'
    if (type?.includes('escalation')) return '#dc2626'
    return '#6366f1'
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 8px', borderRadius: '6px', color: '#94a3b8',
          transition: 'background 0.15s',
        }}
        title="Notifications"
      >
        <span style={{ fontSize: '18px' }}>🔔</span>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: '#ef4444', color: '#fff', borderRadius: '999px',
            fontSize: '10px', fontWeight: 700, minWidth: '16px', height: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', width: '360px',
          background: '#fff', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>Notifications {count > 0 && <span style={{ color: '#ef4444' }}>({count})</span>}</span>
            {count > 0 && <button onClick={markAllRead} style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>}
          </div>

          {/* List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading && <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading…</div>}
            {!loading && !notifs.length && <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No notifications</div>}
            {notifs.map(n => (
              <div
                key={n.notif_id}
                onClick={() => !n.is_read && markRead(n.notif_id)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid #f8fafc', cursor: n.is_read ? 'default' : 'pointer',
                  background: n.is_read ? '#fff' : '#f0f9ff',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.is_read ? '#cbd5e1' : typeColor(n.notif_type), marginTop: '5px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: n.is_read ? 400 : 600, color: '#1e293b', marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.message?.slice(0, 100)}{n.message?.length > 100 ? '…' : ''}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                      {new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
