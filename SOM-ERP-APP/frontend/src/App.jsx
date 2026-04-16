import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Stock from './pages/Stock.jsx'
import RmMaster from './pages/RmMaster.jsx'
import LocationMaster from './pages/LocationMaster.jsx'
import ProductMaster from './pages/ProductMaster.jsx'
import EquipmentMaster from './pages/EquipmentMaster.jsx'
import PrintMaster from './pages/PrintMaster.jsx'
import Inward from './pages/Inward.jsx'
import Outward from './pages/Outward.jsx'
import RecipeDB from './pages/RecipeDB.jsx'
import Indent from './pages/Indent.jsx'
import SFG from './pages/SFG.jsx'
import Ledger from './pages/Ledger.jsx'
import Import from './pages/Import.jsx'
import Tracker from './pages/Tracker.jsx'
import GRN from './pages/GRN.jsx'
import Production from './pages/Production.jsx'

// Grouped navigation — each group has a label and its items
const NAV_GROUPS = [
  {
    group: 'OVERVIEW',
    items: [
      { to: '/stock', label: 'Stock Dashboard', icon: '▦' },
    ]
  },
  {
    group: 'MASTER DATA',
    items: [
      { to: '/rm-master',        label: 'Item Master',        icon: '⬡' },
      { to: '/product-master',   label: 'Product Master',     icon: '◈' },
      { to: '/equipment-master', label: 'Equipment Master',   icon: '◎' },
      { to: '/recipe',           label: 'Recipe / BOM',       icon: '≡' },
    ]
  },
  {
    group: 'PLANNING',
    items: [
      { to: '/indent',   label: 'Indent Management', icon: '◻' },
      { to: '/sfg',      label: 'SFG Tracker',       icon: '◑' },
      { to: '/tracker',  label: 'Batch Tracker',     icon: '◈' },
    ]
  },
  {
    group: 'PRODUCTION',
    items: [
      { to: '/production', label: 'Production Master', icon: '🏭' },
    ]
  },
  {
    group: 'WAREHOUSE',
    items: [
      { to: '/print-master',    label: 'Print Master',    icon: '▣' },
      { to: '/location-master', label: 'Location Master', icon: '📍' },
      { to: '/inward',          label: 'Inward',          icon: '↓' },
      { to: '/outward',         label: 'Outward',         icon: '↑' },
      { to: '/grn',             label: 'GRN',             icon: '☰' },
    ]
  },
  {
    group: 'REPORTS',
    items: [
      { to: '/ledger', label: 'Stock Ledger', icon: '▤' },
      { to: '/import', label: 'Data Import',  icon: '⇪' },
    ]
  },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: '220px', background: '#0f172a', flexShrink: 0 }}
          className="flex flex-col h-full">

          {/* Wordmark */}
          <div style={{ borderBottom: '1px solid #1e293b', padding: '18px 20px 16px' }}>
            <div style={{ color: '#f8fafc', fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em' }}>
              SOM PHYTOPHARMA
            </div>
            <div style={{ color: '#475569', fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', marginTop: '3px' }}>
              ERP — INVENTORY & PRODUCTION
            </div>
          </div>

          {/* Nav groups */}
          <nav className="flex-1 overflow-y-auto" style={{ padding: '8px 0' }}>
            {NAV_GROUPS.map(({ group, items }) => (
              <div key={group} style={{ marginBottom: '4px' }}>
                <div style={{
                  color: '#334155',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  padding: '10px 20px 4px',
                }}>
                  {group}
                </div>
                {items.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 20px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#f8fafc' : '#94a3b8',
                      background: isActive ? '#1e3a5f' : 'transparent',
                      borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      letterSpacing: '0.01em',
                    })}
                  >
                    <span style={{ fontSize: '11px', opacity: 0.7, minWidth: '14px', textAlign: 'center' }}>{icon}</span>
                    {label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #1e293b',
            padding: '12px 20px',
            color: '#334155',
            fontSize: '10px',
            letterSpacing: '0.04em',
          }}>
            v2.3 · SOM Phytopharma (India) Ltd
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/stock" replace />} />
            <Route path="/stock"            element={<Stock />} />
            <Route path="/rm-master"        element={<RmMaster />} />
            <Route path="/product-master"   element={<ProductMaster />} />
            <Route path="/equipment-master" element={<EquipmentMaster />} />
            <Route path="/print-master"     element={<PrintMaster />} />
            <Route path="/inward"           element={<Inward />} />
            <Route path="/outward"          element={<Outward />} />
            <Route path="/recipe"           element={<RecipeDB />} />
            <Route path="/indent"           element={<Indent />} />
            <Route path="/sfg"              element={<SFG />} />
            <Route path="/ledger"           element={<Ledger />} />
            <Route path="/import"           element={<Import />} />
            <Route path="/tracker"          element={<Tracker />} />
            <Route path="/grn"              element={<GRN />} />
            <Route path="/production"       element={<Production />} />
            <Route path="/location-master"  element={<LocationMaster />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
