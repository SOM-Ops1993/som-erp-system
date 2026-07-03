import { useState, useRef } from 'react'
import { importApi } from '../../../../api/inventory.js'
import { BackButton, Button } from '../../../../components/ui'
import ResultCard from '../components/result-card/ResultCard.jsx'
import FormatGuide from '../components/format-guide/FormatGuide.jsx'

export default function Import() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f); setPreview(null); setResult(null); setError('')
  }

  const analyze = async () => {
    if (!file) { setError('Please select a file first'); return }
    setLoading(true); setError(''); setPreview(null)
    try {
      const res = await importApi.preview(file)
      setPreview(res.data)
    } catch (e) {
      setError('Preview failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const execute = async () => {
    if (!file) { setError('Please select a file first'); return }
    if (!confirm('This will import data into the database. Continue?')) return
    setExecuting(true); setError(''); setResult(null)
    try {
      const res = await importApi.execute(file)
      setResult(res.data)
    } catch (e) {
      setError('Import failed: ' + e.message)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Legacy Data</h1>
          <p className="text-gray-500 text-sm">Upload your existing Excel file to bring historical data into the system</p>
        </div>
        <BackButton />
      </div>

      {/* Upload area */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        <div className="text-4xl mb-3">📁</div>
        {file ? (
          <div>
            <p className="font-semibold text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-gray-700">Click to upload Excel file</p>
            <p className="text-sm text-gray-400 mt-1">Supports .xlsx, .xls, .csv</p>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

      <div className="flex gap-3 mb-6">
        <Button
          variant="outline"
          fullWidth
          loading={loading}
          disabled={!file}
          onClick={analyze}
        >
          {loading ? 'Analyzing...' : 'Analyze & Preview'}
        </Button>
        <Button
          variant="success"
          fullWidth
          loading={executing}
          disabled={!file}
          onClick={execute}
        >
          {executing ? 'Importing...' : 'Import to Database'}
        </Button>
      </div>

      {/* Preview results */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">📋 File Preview</h2>
          <p className="text-sm text-gray-500 mb-3">{preview.totalSheets} sheet(s) found</p>
          {Object.entries(preview.summary).map(([sheet, info]) => {
            const detected = preview.detectedAs?.[sheet] || ''
            const skipped = detected.includes('skipped')
            const autoDetect = detected.includes('auto-detected')
            return (
              <div key={sheet} className="mb-5">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-800">Sheet: {sheet}</span>
                  <span className="text-gray-400 text-xs">({info.rowCount} rows)</span>
                  {detected && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      skipped ? 'bg-yellow-100 text-yellow-700' :
                      autoDetect ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {detected}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-2">Columns: {info.columns.join(', ')}</div>
                {info.sample.length > 0 && !skipped && (
                  <div className="overflow-x-auto">
                    <table className="text-xs border border-gray-200 rounded">
                      <thead className="bg-gray-50">
                        <tr>{info.columns.map(c => <th key={c} className="px-2 py-1 border-r border-gray-200 text-left">{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {info.sample.map((row, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            {info.columns.map(c => <td key={c} className="px-2 py-1 border-r border-gray-100">{String(row[c] || '')}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mt-3 text-sm text-blue-800">
            ✅ Review the detected sheet types above, then click <strong>"Import to Database"</strong>.
          </div>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="font-bold text-green-900 mb-3">✅ Import Complete</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <ResultCard label="Products" value={result.productMaster} color="text-violet-700" />
            <ResultCard label="RM Items" value={result.rmMaster} color="text-green-700" />
            <ResultCard label="Recipe/BOM Lines" value={result.recipeBom} color="text-teal-700" />
            <ResultCard label="Equipment" value={result.equipmentMaster} color="text-blue-700" />
            <ResultCard label="Packs Imported" value={result.printMaster} color="text-indigo-700" />
            <ResultCard label="Inward Records" value={result.inward} color="text-orange-700" />
            <ResultCard label="Outward Records" value={result.outward} color="text-red-700" />
            {result.fuzzyMatches > 0 && <ResultCard label="Fuzzy RM Matches" value={result.fuzzyMatches} color="text-amber-700" />}
          </div>
          {result.fuzzyLog?.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-800 text-xs font-medium mb-1">🔗 RM name variations auto-matched:</p>
              {result.fuzzyLog.slice(0, 8).map((l, i) => <p key={i} className="text-amber-700 text-xs">• {l}</p>)}
              {result.fuzzyLog.length > 8 && <p className="text-amber-600 text-xs mt-1">…and {result.fuzzyLog.length - 8} more</p>}
            </div>
          )}
          {result.errors?.length > 0 && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm font-medium mb-1">⚠️ {result.errors.length} row-level warning(s):</p>
              {result.errors.slice(0, 8).map((e, i) => <p key={i} className="text-yellow-700 text-xs">{e}</p>)}
              {result.errors.length > 8 && <p className="text-yellow-600 text-xs mt-1">…and {result.errors.length - 8} more</p>}
            </div>
          )}
        </div>
      )}

      <FormatGuide />
    </div>
  )
}
