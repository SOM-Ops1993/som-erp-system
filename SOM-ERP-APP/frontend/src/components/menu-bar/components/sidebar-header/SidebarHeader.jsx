import './SidebarHeader.css'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

function CollapseBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Collapse sidebar" className="sh-btn sh-btn--collapse">
      <PanelLeftClose size={14} />
    </button>
  )
}

function ExpandBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Expand sidebar" className="sh-btn sh-btn--expand">
      <PanelLeftOpen size={16} />
    </button>
  )
}

export default function SidebarHeader({ sidebarOpen, onCollapse, onExpand }) {
  return (
    <div className={`sh-root ${sidebarOpen ? 'sh-root--open' : 'sh-root--collapsed'}`}>
      {sidebarOpen ? (
        <>
          <div className="sh-brand">
            <div className="sh-logo-box">
              <img src="/logo.png" alt="SOM" />
            </div>
            <div className="sh-brand-text">
              <div className="sh-brand-name">SOM ERP</div>
              <div className="sh-brand-sub">MANUFACTURING</div>
            </div>
          </div>
          <CollapseBtn onClick={onCollapse} />
        </>
      ) : (
        <ExpandBtn onClick={onExpand} />
      )}
    </div>
  )
}
