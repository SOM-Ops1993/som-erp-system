import { useRef, useState } from 'react'
import { importApi } from '../../../../api/inventory.js'

export default function RecipeImportModal({ onClose, onDone }) {
  const fileRef = useRef(null)
  const [importFile, setImportFile]     = useState(null)
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)

  const handleImport = async () => {
    if (!importFile) return
    setImporting(true); setImportResult(null)
    try {
      const res = await importApi.execute(importFile)
      setImportResult(res)
      onDone(res)
    } catch (e) { setImportResult({ error: e.message }) }
    setImporting(false)
  }

  const handleClose = () => { setImportFile(null); setImportResult(null); onClose() }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">📥 Import Recipe from Excel</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Expected Excel format:</p>
          <p>Required columns: <strong>Product Name</strong>, <strong>Raw Material</strong>, <strong>Qty Per Unit</strong>, <strong>UOM</strong></p>
          <p className="mt-1 text-xs text-blue-600">Sheet tab name <em>or</em> file name should contain <strong>bom</strong>, <strong>recipe</strong>, or <strong>formula</strong>.</p>
          <p className="mt-1 text-xs text-amber-700 font-semibold">⚠ Raw Materials must already exist in RM Master. Unrecognised RMs are skipped and listed in warnings.</p>
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
          onClick={() => fileRef.current?.click()}
        >
          {importFile ? (
            <div>
              <div className="text-green-600 text-2xl mb-1">✅</div>
              <p className="font-medium text-gray-700">{importFile.name}</p>
              <p className="text-xs text-gray-400">{(importFile.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm text-gray-600">Click to select Excel file (.xlsx)</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { setImportFile(e.target.files[0]); setImportResult(null) }} />
        </div>

        {importResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${importResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
            {importResult.error ? <p>❌ {importResult.error}</p> : (
              <div className="space-y-0.5">
                <p className="font-semibold">Import Complete</p>
                <p>Recipe lines: <strong>{importResult.data?.recipeBom || 0}</strong></p>
                <p>Products: <strong>{importResult.data?.productMaster || 0}</strong></p>
                <p>RM items: <strong>{importResult.data?.rmMaster || 0}</strong></p>
                {importResult.data?.fuzzyMatches > 0 && (
                  <p className="text-amber-700 font-medium">🔗 {importResult.data.fuzzyMatches} RM name(s) fuzzy-matched</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={handleImport} disabled={!importFile || importing}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50">
            {importing ? 'Importing...' : '📥 Import Now'}
          </button>
          <button onClick={handleClose} className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
