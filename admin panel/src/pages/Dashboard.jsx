import { Link } from 'react-router-dom';
import { resources } from '../data/resources.js';

const GROUP_LABELS = {
  gate:       'Gate & Supply Chain',
  inventory:  'Inventory',
  sales:      'Sales',
  production: 'Production',
  planning:   'Planning',
  hr:         'HR',
  microbial:  'Microbial',
};

const GROUP_COLORS = {
  gate:       '#f59e0b',
  inventory:  '#2563eb',
  sales:      '#16a34a',
  production: '#9333ea',
  planning:   '#ea580c',
  hr:         '#0891b2',
  microbial:  '#be185d',
};

export default function Dashboard() {
  const groups = Object.keys(GROUP_LABELS).map((key) => ({
    key,
    label: GROUP_LABELS[key],
    color: GROUP_COLORS[key],
    items: resources.filter((r) => r.group === key),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Panel</p>
          <h2>Application Data <span className="record-count">{resources.length} tables</span></h2>
          <p className="text-muted mb-0">Click any table to view, add, edit, or delete records.</p>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.key} style={{ marginBottom: 32 }}>
          <div className="sidebar-section" style={{ color: group.color, fontSize: '0.75rem', padding: '0 0 8px', marginBottom: 8 }}>
            {group.label}
          </div>
          <div className="resource-grid">
            {group.items.map((resource) => (
              <Link to={`/${resource.path}`} className="resource-card" key={resource.key}
                style={{ '--card-accent': group.color }}>
                <span>{resource.model}</span>
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
