import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Package, ArrowDownCircle, ArrowUpCircle, BookOpen,
  ClipboardList, BarChart2, ScrollText, Upload, Menu, X,
  QrCode, FlaskConical, Database
} from 'lucide-react'

const NAV = [
  { to: '/stock',        icon: BarChart2,       label: 'Stock Dashboard' },
  { to: '/print-master', icon: QrCode,          label: 'Print Master' },
  { to: '/inward',       icon: ArrowDownCircle, label: 'Inward' },
  { to: '/outward',      icon: ArrowUpCircle,   label: 'Outward' },
  { to: '/indent',       icon: ClipboardList,   label: 'Indent' },
  { to: '/sfg',          icon: FlaskConical,    label: 'SFG Tracker' },
  { to: '/recipe',       icon: BookOpen,        label: 'Recipe DB' },
  { to: '/masters',      icon: Database,        label: 'Masters' },
  { to: '/ledger',       icon: ScrollText,      label: 'Stock Ledger' },
  { to: '/import',       icon: Upload,          label: 'Import Data' },
]

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const currentPage = NAV.find((n) => location.pathname.startsWith(n.to))?.label || 'SOM ERP'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-primary text-white h-14 flex items-center px-4 shadow-lg z-50 fixed top-0 w-full">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 mr-3 lg:hidden">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Package size={20} className="text-accent shrink-0" />
          <span className="font-bold text-base truncate">SOM ERP</span>
          <span className="hidden sm:block text-gray-400 text-sm ml-1">/ {currentPage}</span>
        </div>
        <div className="text-xs text-gray-400 hidden md:block">QR Inventory System</div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200 fixed h-full top-14 pt-4 overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Sidebar — mobile overlay */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 top-14">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
            <aside className="relative bg-white w-64 h-full shadow-xl pt-4 overflow-y-auto">
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-56 min-h-full">
          <div className="page-enter p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
            ${isActive
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-primary'
            }`
          }
        >
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
