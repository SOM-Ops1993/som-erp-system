/**
 * ExportButton — downloads a report URL as an xlsx file
 * Sends token in header via fetch + blob download
 */
export default function ExportButton({ url, label = 'Export Excel', filename }) {
  const download = async () => {
    const token = localStorage.getItem('erp_token')
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const dlUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dlUrl
      a.download = filename || extractFilename(res) || 'export.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(dlUrl)
    } catch (e) {
      alert(`Export error: ${e.message}`)
    }
  }

  return (
    <button
      onClick={download}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '7px 14px', background: '#16a34a', color: '#fff',
        border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.target.style.background = '#15803d'}
      onMouseLeave={e => e.target.style.background = '#16a34a'}
    >
      <span>⬇</span> {label}
    </button>
  )
}

function extractFilename(res) {
  const cd = res.headers.get('Content-Disposition') || ''
  const match = cd.match(/filename="?([^";\n]+)"?/)
  return match ? match[1] : null
}
