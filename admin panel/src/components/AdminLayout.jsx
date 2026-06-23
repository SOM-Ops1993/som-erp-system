import { NavLink, Outlet } from 'react-router-dom';
import { resources } from '../data/resources.js';

const GROUPS = [
  { key: 'gate',       label: 'Gate & Supply Chain' },
  { key: 'inventory',  label: 'Inventory' },
  { key: 'sales',      label: 'Sales' },
  { key: 'production', label: 'Production' },
  { key: 'planning',   label: 'Planning' },
  { key: 'hr',         label: 'HR' },
  { key: 'microbial',  label: 'Microbial' },
];

const TableIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

export default function AdminLayout() {
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: resources.filter((r) => r.group === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <h1>SOM ERP</h1>
            <p>Admin Data Panel</p>
          </div>
        </div>

        <nav className="nav flex-column">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </NavLink>

          {grouped.map((group) => (
            <div key={group.key}>
              <div className="sidebar-section">{group.label}</div>
              {group.items.map((resource) => (
                <NavLink
                  key={resource.key}
                  to={`/${resource.path}`}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <TableIcon />
                  {resource.title}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
