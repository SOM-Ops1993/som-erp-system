import { useRef, useState } from 'react'
import { Download, FolderOpen, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { microbialSfgApi } from '../../../../../api/microbial.js'
import { Button } from '../../../../../components/ui'

const S = {
  card:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:    { textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' },
  td:    { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a', verticalAlign: 'middle' },
}

export default function MicrobeImport({ onImportDone }) {
  const fileRef = useRef(null)
  const [importRows, setImportRows]       = useState([])
  const [importStatus, setImportStatus]   = useState(null)
  const [importLoading, setImportLoading] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb   = XLSX.read(ev.target.result, { type: 'binary' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      setImportRows(rows)
      setImportStatus(null)
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!importRows.length) return
    setImportLoading(true)
    try {
      const res = await microbialSfgApi.importMicrobes(importRows)
      setImportStatus(res)
      onImportDone()
    } catch (err) { alert(err.message) }
    setImportLoading(false)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Microbe Name': 'Bacillus subtilis', 'Microbe Code': 'BS001' },
      { 'Microbe Name': 'Trichoderma viride', 'Microbe Code': 'TV001' },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Microbes')
    XLSX.writeFile(wb, 'microbe_master_template.xlsx')
  }

  return (
    <div style={S.card}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '4px' }}>
        ⇪ Import Microbes from Excel
      </h3>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
        Upload an Excel file with columns: <strong>Microbe Name</strong>, <strong>Microbe Code</strong>. Existing codes will be updated.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <Button variant="outline-gray" icon={Download} onClick={downloadTemplate}>Download Template</Button>
        <Button variant="primary" icon={FolderOpen} onClick={() => fileRef.current?.click()}>Choose Excel File</Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      {importRows.length > 0 && (
        <>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, marginBottom: '8px' }}>
              Preview — {importRows.length} row(s) detected
            </p>
            <table style={{ ...S.table, fontSize: '12px' }}>
              <thead>
                <tr>{Object.keys(importRows[0]).map(k => <th key={k} style={{ ...S.th, padding: '6px 10px' }}>{k}</th>)}</tr>
              </thead>
              <tbody>
                {importRows.slice(0, 8).map((r, i) => (
                  <tr key={i}>{Object.values(r).map((v, j) => <td key={j} style={{ ...S.td, padding: '6px 10px' }}>{String(v)}</td>)}</tr>
                ))}
              </tbody>
            </table>
            {importRows.length > 8 && (
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>…and {importRows.length - 8} more rows</p>
            )}
          </div>
          <Button variant="success" icon={Upload} onClick={handleImport} disabled={importLoading} loading={importLoading}>
            {importLoading ? 'Importing…' : `Import ${importRows.length} Microbe(s)`}
          </Button>
        </>
      )}

      {importStatus && (
        <div style={{ marginTop: '16px', fontSize: '13px' }}>
          <div style={{
            padding: '14px 18px', borderRadius: '8px', marginBottom: importStatus.errors?.length ? '10px' : 0,
            background: importStatus.imported > 0 ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${importStatus.imported > 0 ? '#bbf7d0' : '#fcd34d'}`,
          }}>
            <strong style={{ color: importStatus.imported > 0 ? '#15803d' : '#92400e' }}>
              {importStatus.imported > 0 ? '✅ Import complete' : '⚠️ Import finished with issues'}
            </strong>
            <span style={{ marginLeft: '12px', color: '#374151' }}>
              <strong style={{ color: '#15803d' }}>{importStatus.imported} imported</strong>
              {importStatus.skipped > 0 && <> · <strong style={{ color: '#dc2626' }}>{importStatus.skipped} skipped</strong></>}
            </span>
          </div>

          {importStatus.imported === 0 && importStatus.skipped > 0 && (
            <div style={{ padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', marginBottom: '10px' }}>
              <p style={{ fontWeight: 700, color: '#c2410c', marginBottom: '6px' }}>Common causes:</p>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#92400e', lineHeight: '1.8' }}>
                <li>Column headers must be exactly <strong>Microbe Name</strong> and <strong>Microbe Code</strong> (case-sensitive)</li>
                <li>Detected columns: <strong>{importRows[0] ? Object.keys(importRows[0]).join(', ') : '—'}</strong></li>
              </ul>
            </div>
          )}

          {importStatus.errors?.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
              <p style={{ fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>Error details ({importStatus.errors.length}):</p>
              {importStatus.errors.map((e, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#991b1b', padding: '3px 0', borderBottom: i < importStatus.errors.length - 1 ? '1px solid #fee2e2' : 'none' }}>
                  <span style={{ fontFamily: 'monospace', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', marginRight: '8px' }}>
                    {e.row || e.code || `row ${i + 1}`}
                  </span>
                  {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
