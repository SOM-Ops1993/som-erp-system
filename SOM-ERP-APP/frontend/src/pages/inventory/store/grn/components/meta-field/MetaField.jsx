import './MetaField.css'

export default function MetaField({ label, value }) {
  return (
    <div>
      <p className="mf-label">{label}</p>
      <p className="mf-value">{value || '—'}</p>
    </div>
  )
}
