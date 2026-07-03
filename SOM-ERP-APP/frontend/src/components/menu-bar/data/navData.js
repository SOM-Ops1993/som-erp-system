import {
  LayoutDashboard, Package, Boxes,
  Layers, FlaskConical, Settings2, Users, GitBranch, Microscope,
  Truck, Thermometer,
  Printer, ArrowDownToLine, ArrowUpFromLine, Container, BarChart2,
  ClipboardList, Snowflake, MapPin, ListChecks,
  ShoppingBag,
  Factory, CalendarDays, Beaker, Activity, Cog, TestTube2,
  ScanLine, FileBarChart, BarChart3, Upload,
} from 'lucide-react'

export const APP_NAV = [
  {
    group: 'DASHBOARD',
    items: [
      { to: '/stock',           label: 'Dashboard',       Icon: LayoutDashboard },
      { to: '/rm-material',     label: 'RM Material',     Icon: Package },
      { to: '/packing-master',  label: 'Packing Material', Icon: Boxes },
    ],
  },
  {
    group: 'MASTER DATA',
    items: [
      { to: '/rm-master',        label: 'Item Master',     Icon: Layers },
      { to: '/product-master',   label: 'Product Master',  Icon: FlaskConical },
      { to: '/equipment-master', label: 'Plant Data',      Icon: Settings2 },
      { to: '/employee-master',  label: 'Employee Data',   Icon: Users },
      { to: '/recipe',           label: 'Recipe / BOM',    Icon: GitBranch },
      { to: '/microbes-master',  label: 'Microbes Master', Icon: Microscope },
    ],
  },
  {
    group: 'GATE & SUPPLY CHAIN',
    items: [
      { to: '/gate',         label: 'Gate Entry', Icon: Truck },
      { to: '/erp/microbial', label: 'Cold Room', Icon: Thermometer },
    ],
  },
  {
    group: 'INVENTORY / MATERIALS',
    items: [
      { to: '/print-master',    label: 'Print Master',     Icon: Printer },
      { to: '/inward',          label: 'Inward',           Icon: ArrowDownToLine },
      { to: '/outward',         label: 'Outward',          Icon: ArrowUpFromLine },
      { to: '/containers',      label: 'Container',        Icon: Container },
      { to: '/ledger',          label: 'Stock Transaction', Icon: BarChart2 },
      { to: '/grn',             label: 'GRN',              Icon: ClipboardList },
      { to: '/microbial-inward', label: 'Microbial Inward', Icon: Snowflake },
      // { to: '/location-master', label: 'Location Master',  Icon: MapPin },
      // { to: '/indent',          label: 'Indent Management', Icon: ListChecks },
    ],
  },
  {
    group: 'SALES',
    items: [
      { to: '/sales-orders', label: 'Sales Orders', Icon: ShoppingBag },
    ],
  },
  {
    group: 'PRODUCTION & PLANNING',
    items: [
      { to: '/planning',      label: 'Production',        Icon: Factory },
      { to: '/erp/planning',  label: 'Planning',          Icon: CalendarDays },
      // { to: '/erp/bom',       label: 'BOM Issuance',      Icon: Beaker },
      { to: '/tracker',       label: 'Batch Tracker',     Icon: Activity },
      { to: '/production',    label: 'Production Master', Icon: Cog },
      { to: '/sfg-store',     label: 'SFG',               Icon: TestTube2 },
    ],
  },
  // {
  //   group: 'QUALITY CONTROL',
  //   items: [
  //     { to: '/qc-samples',  label: 'QC Samples',  Icon: ScanLine,    soon: true },
  //     { to: '/qc-results',  label: 'Test Results', Icon: BarChart3,   soon: true },
  //     { to: '/qc-reports',  label: 'Reports',      Icon: FileBarChart, soon: true },
  //   ],
  // },
  {
    group: 'REPORTS / DATA',
    items: [
      { to: '/import', label: 'Data Import', Icon: Upload },
    ],
  },
]

export const LEGACY_NAV = APP_NAV
export const ERP_NAV    = APP_NAV

export const ROLE_BADGE = {
  admin:            { bg: '#fef3c7', color: '#92400e' },
  store_manager:    { bg: '#dcfce7', color: '#166534' },
  store_person:     { bg: '#dbeafe', color: '#1e40af' },
  planning_manager: { bg: '#ede9fe', color: '#6b21a8' },
  production:       { bg: '#fce7f3', color: '#9d174d' },
  sales:            { bg: '#e0f2fe', color: '#0369a1' },
}

export const PAGE_NAMES = {
  gate:      'Gate Entry',
  inventory: 'Inventory Management',
  bom:       'BOM Issuance',
  planning:  'Planning Engine',
  sales:     'Sales Orders',
  microbial: 'Cold Room IMS',
}
