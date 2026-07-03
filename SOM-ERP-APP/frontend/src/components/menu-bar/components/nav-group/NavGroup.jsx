import './NavGroup.css'
import { ChevronDown } from 'lucide-react'
import NavItem from '../nan-item/NavItem.jsx'

const NavGroup = ({ group, items, isOpen, hasActive, sidebarOpen, onToggle }) => {
  const FirstIcon = items.find(i => !i.soon)?.Icon ?? items[0]?.Icon
  const activeCollapsed = hasActive && !sidebarOpen

  return (
    <div className="ng-root">

      <button
        onClick={onToggle}
        title={!sidebarOpen ? group : undefined}
        className={[
          'ng-btn',
          sidebarOpen ? 'ng-btn--open' : 'ng-btn--collapsed',
          activeCollapsed ? 'ng-btn--active' : '',
        ].join(' ')}
      >
        {sidebarOpen ? (
          <>
            <span className={`ng-label ${hasActive ? 'ng-label--active' : ''}`}>
              {group}
            </span>
            <span className={`ng-chevron ${isOpen ? 'ng-chevron--open' : 'ng-chevron--closed'}`}>
              <ChevronDown size={12} />
            </span>
          </>
        ) : (
          FirstIcon && (
            <span className={`ng-icon ${hasActive ? 'ng-icon--active' : ''}`}>
              <FirstIcon size={18} />
            </span>
          )
        )}
      </button>

      <div className={`ng-accordion ${sidebarOpen && isOpen ? 'ng-accordion--visible' : 'ng-accordion--hidden'}`}>
        {items.map(({ to, label, Icon, soon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} soon={soon} />
        ))}
      </div>

      <div className="ng-divider" />
    </div>
  )
}

export default NavGroup
