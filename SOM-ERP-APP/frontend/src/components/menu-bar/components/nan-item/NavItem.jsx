import './NavItem.css'
import { NavLink } from 'react-router-dom'

function SoonItem({ label, Icon }) {
  return (
    <div className="ni-item ni-soon">
      <Icon size={14} className="ni-soon-icon" />
      <span className="ni-soon-label">{label}</span>
      <span className="ni-soon-badge">SOON</span>
    </div>
  )
}

export default function NavItem({ to, label, Icon, soon }) {
  if (soon) return <SoonItem label={label} Icon={Icon} />

  return (
    <NavLink to={to} className="ni-item ni-link">
      <Icon size={14} className="ni-icon" />
      <span className="ni-label">{label}</span>
    </NavLink>
  )
}
