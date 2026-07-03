import './menu-bar.css'
import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { PanelLeftOpen } from 'lucide-react'
import { APP_NAV } from '../data/navData.js'
import { operationForPath } from '../../../routes/operationMap.js'
import { useApp } from '../../../context/context.jsx'
import SidebarHeader  from '../components/sidebar-header/SidebarHeader.jsx'
import NavGroup       from '../components/nav-group/NavGroup.jsx'
import SidebarFooter  from '../components/sidebar-footer/SidebarFooter.jsx'

const INITIALLY_OPEN = new Set(['DASHBOARD'])

const Sidebar = () => {

  // Start collapsed on narrow viewports (mobile drawer hidden by default),
  // open on desktop.
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches
  )
  const [openGroups, setOpenGroups]   = useState(() => new Set(INITIALLY_OPEN))
  const location = useLocation()
  const { user } = useApp()

  // Only show nav groups/items the current account's operation can reach —
  // an 'admin' operation account (super-admin) sees everything.
  const visibleNav = useMemo(() => {
    if (user?.operation === 'admin') return APP_NAV
    return APP_NAV
      .map(({ group, items }) => ({
        group,
        items: items.filter(i => {
          const op = operationForPath(i.to)
          return !op || op === user?.operation
        }),
      }))
      .filter(({ items }) => items.length > 0)
  }, [user])

  useEffect(() => {
    visibleNav.forEach(({ group, items }) => {
      if (items.some(i => i.to === location.pathname))
        setOpenGroups(prev => new Set([...prev, group]))
    })
  }, [location.pathname, visibleNav])

  const toggleGroup = (group) =>
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })

  return (
    <>
      {/* Mobile-only: tapping outside the open drawer closes it */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>
        <SidebarHeader
          sidebarOpen={sidebarOpen}
          onCollapse={() => setSidebarOpen(false)}
          onExpand={() => setSidebarOpen(true)}
        />

        <nav className="sidebar-nav">
          {visibleNav.map(({ group, items }) => (
            <NavGroup
              key={group}
              group={group}
              items={items}
              isOpen={openGroups.has(group)}
              hasActive={items.some(i => i.to === location.pathname)}
              sidebarOpen={sidebarOpen}
              onToggle={() => {
                if (!sidebarOpen) setSidebarOpen(true)
                toggleGroup(group)
              }}
            />
          ))}
        </nav>

        <SidebarFooter sidebarOpen={sidebarOpen} />
      </aside>

      {/* Mobile-only: sidebar collapses to zero width there, so this
          floating button is the only way left to reopen it */}
      {!sidebarOpen && (
        <button
          className="sidebar-mobile-fab"
          title="Expand sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen size={18} />
        </button>
      )}
    </>
  )
}


export default Sidebar;