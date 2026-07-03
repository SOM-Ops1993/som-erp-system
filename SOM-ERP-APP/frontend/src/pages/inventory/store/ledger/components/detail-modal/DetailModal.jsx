import './DetailModal.css'

export function DSection({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">{title}</h3>
      {children}
    </div>
  )
}

export function DGrid({ children }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
}

export function DRow({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-medium text-gray-800 break-all ${mono ? 'font-mono text-blue-700 text-xs' : ''}`}>{value}</p>
    </div>
  )
}
