export default function MetaField({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '3px' }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{value || '—'}</p>
    </div>
  )
}
