import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { APP_NAV } from '../data/navData.js'

// Only Dashboard starts open; everything else is collapsed
const INITIALLY_OPEN = new Set(['DASHBOARD'])

export default function AppSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState(() => new Set(INITIALLY_OPEN))
  const location = useLocation()

  // Auto-expand the group that contains the currently active route
  useEffect(() => {
    APP_NAV.forEach(({ group, items }) => {
      if (items.some(i => i.to === location.pathname)) {
        setOpenGroups(prev => new Set([...prev, group]))
      }
    })
  }, [location.pathname])

  const toggleGroup = (group) =>
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })

  return (
    <aside
      style={{
        width: sidebarOpen ? '220px' : '60px',
        minWidth: sidebarOpen ? '220px' : '60px',
        background: 'linear-gradient(180deg, #0f1117 0%, #13161f 60%, #0d1018 100%)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        boxShadow: '1px 0 0 rgba(255,255,255,0.06), 4px 0 24px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: sidebarOpen ? '14px 14px 12px' : '14px 0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          gap: '8px',
          minHeight: '64px',
          flexShrink: 0,
        }}
      >
        {sidebarOpen ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '4px 7px',
                  flexShrink: 0,
                  boxShadow: '0 1px 6px rgba(0,0,0,0.3)',
                }}
              >
                <img src="/logo.png" alt="SOM" style={{ height: '26px', width: 'auto', display: 'block' }} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#f1f5f9', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                  SOM ERP
                </div>
                <div style={{ color: '#6366f1', fontSize: '8px', letterSpacing: '0.14em', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  MANUFACTURING
                </div>
              </div>
            </div>

            {/* Collapse button */}
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8',
                fontSize: '13px',
                flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#a5b4fc' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}
            >
              ‹
            </button>
          </>
        ) : (
          /* Expand button when collapsed */
          <button
            onClick={() => setSidebarOpen(true)}
            title="Expand sidebar"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '15px',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#a5b4fc' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}
          >
            ›
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
        {APP_NAV.map(({ group, items }) => {
          const isOpen = openGroups.has(group)
          const hasActive = items.some(i => i.to === location.pathname)
          const firstIcon = items.find(i => !i.soon)?.icon ?? items[0]?.icon

          return (
            <div key={group} style={{ marginBottom: '1px' }}>

              {/* ── Group header ── */}
              <button
                onClick={() => {
                  if (!sidebarOpen) setSidebarOpen(true)
                  toggleGroup(group)
                }}
                title={!sidebarOpen ? group : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: hasActive && !sidebarOpen ? 'rgba(99,102,241,0.1)' : 'none',
                  border: 'none',
                  borderLeft: hasActive && !sidebarOpen ? '2px solid #6366f1' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: sidebarOpen ? '7px 14px 6px' : '9px 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = hasActive && !sidebarOpen ? 'rgba(99,102,241,0.1)' : 'none' }}
              >
                {sidebarOpen ? (
                  <>
                    <span
                      style={{
                        color: hasActive ? '#cbd5e1' : '#8899aa',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        flex: 1,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                      }}
                    >
                      {group}
                    </span>
                    <span
                      style={{
                        color: '#475569',
                        fontSize: '10px',
                        display: 'inline-block',
                        transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease',
                        lineHeight: 1,
                        marginRight: '2px',
                      }}
                    >
                      ▾
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: '15px',
                      color: hasActive ? '#818cf8' : '#3d4a5c',
                      transition: 'color 0.15s',
                    }}
                  >
                    {firstIcon}
                  </span>
                )}
              </button>

              {/* ── Items (accordion) ── */}
              <div
                style={{
                  maxHeight: sidebarOpen && isOpen ? '600px' : '0px',
                  overflow: 'hidden',
                  transition: 'max-height 0.25s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {items.map(({ to, label, icon, soon }) =>
                  soon ? (
                    <div
                      key={to}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '7px 14px 7px 24px',
                        fontSize: '13.5px',
                        color: '#5a6a7a',
                        cursor: 'default',
                        borderLeft: '2px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: '11px', minWidth: '14px', textAlign: 'center', opacity: 0.3 }}>{icon}</span>
                      <span style={{ opacity: 0.3, flex: 1 }}>{label}</span>
                      <span
                        style={{
                          fontSize: '8px',
                          background: 'rgba(99,102,241,0.15)',
                          color: '#6366f1',
                          borderRadius: '3px',
                          padding: '1px 5px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          flexShrink: 0,
                        }}
                      >
                        SOON
                      </span>
                    </div>
                  ) : (
                    <NavLink
                      key={to}
                      to={to}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '7px 14px 7px 24px',
                        fontSize: '13.5px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#f1f5f9' : '#b0bec5',
                        background: isActive
                          ? 'linear-gradient(90deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.05) 100%)'
                          : 'transparent',
                        borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
                        textDecoration: 'none',
                        transition: 'all 0.12s',
                        letterSpacing: '0.01em',
                      })}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#e2e8f0' }}
                      onMouseLeave={e => {
                        const active = e.currentTarget.getAttribute('aria-current') === 'page'
                        e.currentTarget.style.background = active ? 'linear-gradient(90deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.05) 100%)' : 'transparent'
                        e.currentTarget.style.color = active ? '#f1f5f9' : '#b0bec5'
                      }}
                    >
                      <span style={{ fontSize: '13px', minWidth: '16px', textAlign: 'center' }}>{icon}</span>
                      <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {label}
                      </span>
                    </NavLink>
                  )
                )}
              </div>

              {/* Divider after each group */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '3px 0' }} />
            </div>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: sidebarOpen ? '8px 14px' : '8px 0',
          color: '#334155',
          fontSize: '9px',
          letterSpacing: '0.04em',
          flexShrink: 0,
          textAlign: sidebarOpen ? 'left' : 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {sidebarOpen ? 'v2.5 · SOM Phytopharma' : 'v2.5'}
      </div>
    </aside>
  )
}
