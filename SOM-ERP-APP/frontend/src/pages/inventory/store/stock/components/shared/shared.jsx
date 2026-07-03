import './shared.css'

export function Skel({ h = 8, w = 20, full }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${full ? 'w-full' : `w-${w}`} h-${h}`} />
}

export function SLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 pl-0.5">
      {children}
    </p>
  )
}
