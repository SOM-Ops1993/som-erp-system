import './SIdebarFooter.css'
import { useApp } from '../../../../context/context.jsx'

const OP_LABEL = { gate: 'Gate', store: 'Store', production: 'Production', admin: 'Admin' }

export default function SidebarFooter({ sidebarOpen }) {
  const { user, logout } = useApp()

  return (
    <div className={`sf-root ${sidebarOpen ? 'sf-root--open' : 'sf-root--collapsed'}`}>
      {user && sidebarOpen && (
        <div style={{ padding: '0 4px 8px', fontSize: '11px', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 700, color: '#b6b8ba', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
          <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span style={{
              background: user.role === 'admin' ? '#dcfce7' : '#f1f5f9',
              color: user.role === 'admin' ? '#166534' : '#64748b',
              padding: '1px 6px', borderRadius: '999px', fontWeight: 600, fontSize: '10px',
            }}>
              {user.role === 'admin' ? 'Full Access' : 'Read-Only'}
            </span>
            <span>{OP_LABEL[user.operation] || user.operation}{user.plant ? ` · ${user.plant}` : ''}</span>
          </div>
          <button onClick={logout}
            style={{ marginTop: '6px', width: '100%', padding: '5px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', color: '#64748b', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      )} 
    </div>
  )
}
