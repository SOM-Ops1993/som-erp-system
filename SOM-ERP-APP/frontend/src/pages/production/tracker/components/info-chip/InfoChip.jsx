import './InfoChip.css'

export default function InfoChip({ label, value, mono }) {
  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-white font-semibold mt-0.5 ${mono ? 'font-mono text-sm' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}
