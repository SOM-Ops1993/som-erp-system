import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'

// ── New core pages ────────────────────────────────────────────────────────────
import EmployeeMaster  from './pages/EmployeeMaster.jsx'
import SalesOrdersPage from './pages/SalesOrders.jsx'
import PlanningPage    from './pages/Planning.jsx'

// ── Legacy app pages (untouched) ─────────────────────────────────────────────
import Stock           from './pages/Stock.jsx'
import RmMaster        from './pages/RmMaster.jsx'
import LocationMaster  from './pages/LocationMaster.jsx'
import ProductMaster   from './pages/ProductMaster.jsx'
import EquipmentMaster from './pages/EquipmentMaster.jsx'
import PrintMaster     from './pages/PrintMaster.jsx'
import Inward          from './pages/Inward.jsx'
import Outward         from './pages/Outward.jsx'
import RecipeDB        from './pages/RecipeDB.jsx'
import Indent          from './pages/Indent.jsx'
import SFG             from './pages/SFG.jsx'           // legacy — kept for backward compat
import MicrobialSFG    from './pages/MicrobialSFG.jsx'
import MicrobesMaster  from './pages/MicrobesMaster.jsx'
import MicrobialInward from './pages/MicrobialInward.jsx'
import Ledger          from './pages/Ledger.jsx'
import Import          from './pages/Import.jsx'
import Tracker         from './pages/Tracker.jsx'
import GRN             from './pages/GRN.jsx'
import Production      from './pages/Production.jsx'

// ── ERP module pages ──────────────────────────────────────────────────────────
import Login               from './pages/erp/Login.jsx'
import GateEntry           from './pages/erp/GateEntry.jsx'
import InventoryManagement from './pages/erp/InventoryManagement.jsx'
import BomIssuance         from './pages/erp/BomIssuance.jsx'
import SectionDashboard    from './pages/erp/SectionDashboard.jsx'
import PlanningEngine      from './pages/erp/PlanningEngine.jsx'
import SalesOrders         from './pages/erp/SalesOrders.jsx'
import MicrobialManagement from './pages/erp/MicrobialManagement.jsx'

// ── ERP support components ────────────────────────────────────────────────────
import { AuthProvider, useAuth } from './components/erp/AuthContext.jsx'
import NotificationBell          from './components/erp/NotificationBell.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// NAV DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const LEGACY_NAV = [
  { group: 'DASHBOARD', items: [
    { to: '/stock', label: 'Stock Dashboard', icon: '▦' },
  ]},
  { group: 'MASTER DATA', items: [
    { to: '/rm-master',        label: 'Item Master',        icon: '⬡' },
    { to: '/product-master',   label: 'Product Master',     icon: '◈' },
    { to: '/equipment-master', label: 'Plant Data',         icon: '◎' },
    { to: '/employee-master',  label: 'Employee Data',      icon: '👥' },
    { to: '/recipe',           label: 'Recipe / BOM',       icon: '≡' },
    { to: '/microbes-master',  label: 'Microbes Master',    icon: '🦠' },
  ]},
  { group: 'INVENTORY / MATERIALS', items: [
    { to: '/print-master',      label: 'Print Master',        icon: '▣' },
    { to: '/inward',            label: 'Inward',              icon: '↓'  },
    { to: '/microbial-inward',  label: 'Microbial Inward',    icon: '🧊' },
    { to: '/outward',           label: 'Outward',             icon: '↑'  },
    { to: '/grn',               label: 'GRN',                 icon: '☰'  },
    { to: '/ledger',            label: 'Stock Ledger',        icon: '▤'  },
    { to: '/location-master',   label: 'Location Master',     icon: '📍' },
    { to: '/indent',            label: 'Indent Management',   icon: '◻' },
  ]},
  { group: 'SALES & PLANNING', items: [
    { to: '/sales-orders', label: 'Sales Orders',           icon: '📋' },
    { to: '/planning',     label: 'Production Planning',    icon: '⚙️' },
  ]},
  { group: 'PRODUCTION / MFG', items: [
    { to: '/tracker',    label: 'Batch Tracker',            icon: '◈' },
    { to: '/production', label: 'Production Master',        icon: '🏭' },
    { to: '/sfg-store',  label: 'SFG',                      icon: '⚗️' },
  ]},
  { group: 'QUALITY CONTROL', items: [
    { to: '/qc-samples', label: 'QC Samples',               icon: '🧫', soon: true },
    { to: '/qc-results', label: 'Test Results',             icon: '🔬', soon: true },
    { to: '/qc-reports', label: 'Reports',                  icon: '📊', soon: true },
  ]},
  { group: 'REPORTS / DATA', items: [
    { to: '/import', label: 'Data Import',                  icon: '⇪' },
  ]},
]

const ERP_NAV = [
  { group: 'SUPPLY CHAIN', items: [
    { to: '/erp/gate',      label: 'Gate Entry',  icon: '🚚' },
    { to: '/erp/inventory', label: 'Inventory',   icon: '📦' },
    { to: '/erp/microbial', label: 'Cold Room',   icon: '🧪' },
  ]},
  { group: 'PRODUCTION', items: [
    { to: '/erp/bom',      label: 'BOM Issuance',      icon: '⚗️'  },
    { to: '/erp/planning', label: 'Planning',           icon: '📋' },
    { to: '/erp/section',  label: 'Section Dashboard',  icon: '🏭' },
  ]},
  { group: 'SALES', items: [
    { to: '/erp/sales', label: 'Sales Orders', icon: '💼' },
  ]},
]

const ROLE_BADGE = {
  admin:            { bg: '#fef3c7', color: '#92400e' },
  store_manager:    { bg: '#dcfce7', color: '#166534' },
  store_person:     { bg: '#dbeafe', color: '#1e40af' },
  planning_manager: { bg: '#ede9fe', color: '#6b21a8' },
  production:       { bg: '#fce7f3', color: '#9d174d' },
  sales:            { bg: '#e0f2fe', color: '#0369a1' },
}

const PAGE_NAMES = {
  gate:      '🚚  Gate Entry',
  inventory: '📦  Inventory Management',
  bom:       '⚗️   BOM Issuance',
  planning:  '📋  Planning Engine',
  sales:     '💼  Sales Orders',
  microbial: '🧪  Cold Room IMS',
  section:   '🏭  Section Dashboard',
  bmr:       '📝  BMR Entry',
}

// ─────────────────────────────────────────────────────────────────────────────
// COMING SOON  (placeholder for QC and future modules)
// ─────────────────────────────────────────────────────────────────────────────
function ComingSoon({ title, icon }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100%', minHeight:'60vh', gap:'16px', color:'#94a3b8',
      fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      <div style={{ fontSize:'52px', opacity:0.4 }}>{icon || '🔧'}</div>
      <div style={{ fontSize:'20px', fontWeight:700, color:'#64748b' }}>{title}</div>
      <div style={{
        background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'8px',
        padding:'8px 20px', fontSize:'12px', fontWeight:700, letterSpacing:'0.1em',
        color:'#94a3b8',
      }}>COMING SOON</div>
      <p style={{ fontSize:'13px', color:'#94a3b8', maxWidth:'320px', textAlign:'center', marginTop:'4px' }}>
        This module is under development and will be available soon.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY LAYOUT  (original app, untouched)
// ─────────────────────────────────────────────────────────────────────────────
function LegacyLayout() {
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <aside style={{ width:'220px', background:'#0d1f0d', flexShrink:0, display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ borderBottom:'1px solid #1a3320', padding:'14px 16px 12px' }}>
          <div style={{ background:'#fff', borderRadius:'8px', padding:'6px 10px', display:'inline-block', marginBottom:'6px' }}>
            <img src="/logo.png" alt="SOM Phytopharma" style={{ height:'32px', width:'auto', display:'block' }} />
          </div>
          <div style={{ color:'#4d7a55', fontSize:'10px', fontWeight:500, letterSpacing:'0.08em' }}>ERP — INVENTORY &amp; PRODUCTION</div>
        </div>
        <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {LEGACY_NAV.map(({ group, items }) => (
            <div key={group} style={{ marginBottom:'4px' }}>
              <div style={{ color:'#2d5c38', fontSize:'9px', fontWeight:700, letterSpacing:'0.12em', padding:'10px 20px 4px' }}>{group}</div>
              {items.map(({ to, label, icon, soon }) => (
                soon ? (
                  <div key={to} style={{
                    display:'flex', alignItems:'center', gap:'10px', padding:'8px 20px',
                    fontSize:'13px', color:'#2d5c38', cursor:'default',
                    borderLeft:'3px solid transparent', letterSpacing:'0.01em',
                  }}>
                    <span style={{ fontSize:'11px', opacity:0.5, minWidth:'14px', textAlign:'center' }}>{icon}</span>
                    <span style={{ opacity:0.45 }}>{label}</span>
                    <span style={{ fontSize:'9px', background:'#1a3320', color:'#4d7a55', borderRadius:'4px', padding:'1px 5px', marginLeft:'auto', letterSpacing:'0.06em', fontWeight:700 }}>SOON</span>
                  </div>
                ) : (
                  <NavLink key={to} to={to} style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:'10px', padding:'8px 20px',
                    fontSize:'13px', fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#f0fdf4' : '#86a98e',
                    background: isActive ? '#1a4a22' : 'transparent',
                    borderLeft: isActive ? '3px solid #4ade80' : '3px solid transparent',
                    textDecoration:'none', transition:'all 0.15s', letterSpacing:'0.01em',
                  })}>
                    <span style={{ fontSize:'11px', opacity:0.7, minWidth:'14px', textAlign:'center' }}>{icon}</span>
                    {label}
                  </NavLink>
                )
              ))}
            </div>
          ))}
        </nav>
        <div style={{ borderTop:'1px solid #1a3320', padding:'10px 12px' }}>
          <NavLink to="/erp/gate" style={{
            display:'flex', alignItems:'center', gap:'8px', padding:'9px 12px',
            background:'#1a4a22', borderRadius:'8px', textDecoration:'none',
            color:'#86efac', fontSize:'12px', fontWeight:600,
          }}>
            <span>⚡</span> Switch to ERP v2
          </NavLink>
        </div>
        <div style={{ borderTop:'1px solid #1a3320', padding:'12px 20px', color:'#2d5c38', fontSize:'10px', letterSpacing:'0.04em' }}>
          v2.5 · SOM Phytopharma (India) Ltd
        </div>
      </aside>
      <main style={{ flex:1, overflowY:'auto', background:'#f1f5f9' }}>
        <Routes>
          <Route path="/"               element={<Navigate to="/stock" replace />} />
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
          <Route path="/sfg-store"        element={<MicrobialSFG />} />
          <Route path="/microbes-master"  element={<MicrobesMaster />} />
          <Route path="/microbial-inward" element={<MicrobialInward />} />
          <Route path="/ledger"           element={<Ledger />} />
          <Route path="/import"           element={<Import />} />
          <Route path="/tracker"          element={<Tracker />} />
          <Route path="/grn"              element={<GRN />} />
          <Route path="/production"       element={<Production />} />
          <Route path="/location-master"  element={<LocationMaster />} />
          <Route path="/employee-master"  element={<EmployeeMaster />} />
          <Route path="/sales-orders"     element={<SalesOrdersPage />} />
          <Route path="/planning"         element={<PlanningPage />} />
          {/* Quality Control — placeholder until pages are built */}
          <Route path="/qc-samples" element={<ComingSoon title="QC Samples" icon="🧫" />} />
          <Route path="/qc-results" element={<ComingSoon title="Test Results" icon="🔬" />} />
          <Route path="/qc-reports" element={<ComingSoon title="QC Reports" icon="📊" />} />
        </Routes>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ERP SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
function ErpSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const rb = ROLE_BADGE[user?.role] || { bg:'#f1f5f9', color:'#475569' }

  return (
    <aside style={{ width:'224px', background:'#0d1f0d', flexShrink:0, display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Logo */}
      <div style={{ borderBottom:'1px solid #1a3320', padding:'14px 16px 12px' }}>
        <div style={{ background:'#fff', borderRadius:'8px', padding:'6px 10px', display:'inline-block', marginBottom:'6px' }}>
          <img src="/logo.png" alt="SOM Phytopharma" style={{ height:'32px', width:'auto', display:'block' }} />
        </div>
        <div style={{ color:'#4ade80', fontSize:'9px', fontWeight:700, letterSpacing:'0.14em', marginTop:'2px' }}>ERP v2 · MANUFACTURING</div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {ERP_NAV.map(({ group, items }) => (
          <div key={group} style={{ marginBottom:'4px' }}>
            <div style={{ color:'#2d5c38', fontSize:'9px', fontWeight:700, letterSpacing:'0.14em', padding:'10px 20px 4px' }}>{group}</div>
            {items.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:'10px', padding:'9px 20px',
                fontSize:'13px', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f0fdf4' : '#86a98e',
                background: isActive ? '#1a4a22' : 'transparent',
                borderLeft: isActive ? '3px solid #4ade80' : '3px solid transparent',
                textDecoration:'none', transition:'all 0.15s',
              })}>
                <span style={{ fontSize:'13px', minWidth:'16px', textAlign:'center' }}>{icon}</span>
                {label}
              </NavLink>
            ))}
          </div>
        ))}
        <div style={{ margin:'12px 12px 4px', borderTop:'1px solid #1a3320' }} />
        <NavLink to="/stock" style={{
          display:'flex', alignItems:'center', gap:'8px',
          padding:'8px 20px', fontSize:'12px', color:'#4d7a55', textDecoration:'none',
        }}>
          <span style={{ fontSize:'11px' }}>◀</span> Legacy App
        </NavLink>
      </nav>

      {/* User card */}
      <div style={{ borderTop:'1px solid #1a3320', padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
          <div style={{
            width:'34px', height:'34px', borderRadius:'50%', flexShrink:0,
            background:'#1a4a22', display:'flex', alignItems:'center', justifyContent:'center',
            color:'#86efac', fontWeight:700, fontSize:'14px',
          }}>
            {(user?.full_name || user?.username || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ color:'#f1f5f9', fontSize:'12px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.full_name || user?.username}
            </div>
            <span style={{
              display:'inline-block', fontSize:'9px', fontWeight:700, letterSpacing:'0.06em',
              padding:'1px 6px', borderRadius:'10px', marginTop:'2px',
              background: rb.bg, color: rb.color,
            }}>
              {(user?.role || '').replace(/_/g,' ').toUpperCase()}
            </span>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/erp/login') }}
          style={{
            width:'100%', padding:'7px', background:'transparent',
            border:'1px solid #1a3320', borderRadius:'6px',
            color:'#4d7a55', fontSize:'11px', fontWeight:600,
            cursor:'pointer', letterSpacing:'0.04em', transition:'all 0.15s',
          }}
          onMouseEnter={e => Object.assign(e.currentTarget.style, { background:'#dc2626', color:'#fff', borderColor:'#dc2626' })}
          onMouseLeave={e => Object.assign(e.currentTarget.style, { background:'transparent', color:'#4d7a55', borderColor:'#1a3320' })}
        >
          ⏻  SIGN OUT
        </button>
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ERP LAYOUT  (auth-gated)
// ─────────────────────────────────────────────────────────────────────────────
function ErpLayout() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/erp/login" state={{ from: location }} replace />

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <ErpSidebar />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Top bar */}
        <header style={{
          height:'48px', background:'#fff', borderBottom:'1px solid #e2e8f0',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 24px', flexShrink:0,
        }}>
          <ErpPageTitle />
          <NotificationBell />
        </header>
        {/* Content */}
        <main style={{ flex:1, overflowY:'auto', background:'#f1f5f9' }}>
          <Routes>
            <Route index           element={<Navigate to="gate" replace />} />
            <Route path="gate"      element={<GateEntry />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="bom"       element={<BomIssuance />} />
            <Route path="planning"  element={<PlanningEngine />} />
            <Route path="sales"     element={<SalesOrders />} />
            <Route path="microbial" element={<MicrobialManagement />} />
            <Route path="section"   element={<SectionDashboard />} />
            <Route path="*"         element={<Navigate to="gate" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function ErpPageTitle() {
  const loc = useLocation()
  const seg = loc.pathname.replace(/\/$/, '').split('/').pop()
  return (
    <span style={{ fontSize:'14px', fontWeight:700, color:'#1e293b' }}>
      {PAGE_NAMES[seg] || 'SOM ERP v2'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ERP LOGIN PAGE  (redirects to destination after login)
// ─────────────────────────────────────────────────────────────────────────────
function ErpLoginPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname || '/erp/gate'

  if (user) return <Navigate to={from} replace />

  return <Login onLogin={() => navigate(from, { replace: true })} />
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ERP v2 — auth-protected, own layout */}
        <Route path="/erp/login" element={
          <AuthProvider><ErpLoginPage /></AuthProvider>
        } />
        <Route path="/erp/*" element={
          <AuthProvider><ErpLayout /></AuthProvider>
        } />

        {/* Legacy app — all existing routes, sidebar unchanged */}
        <Route path="/*" element={<LegacyLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
