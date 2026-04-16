import { useState, useRef } from 'react'
import { importApi } from '../api/client'
import { Upload, AlertTriangle, CheckCircle, FileSpreadsheet } from 'lucide-react'

export default function Import() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('upload') // upload | preview | executing | done
  const fileRef = useRef()

  const handleFile = (f) => {
    setFile(f)
    setPreview(null)
    setResult(null)
    setError(null)
    setStep('upload')
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await importApi.preview(file)
      setPreview(res.summary)
      setStep('preview')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    setLoading(true)
    setStep('executing')
    try {
      const res = await importApi.execute(file)
      setResult(res.results)
      setStep('done')
    } catch (err) {
      setError(err.message)
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Upload size={24} className="text-primary" />
        <h1 className="text-xl font-bold text-primary">Legacy Data Import</h1>
      </div>

      {step !== 'done' && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-700 mb-2">Upload Excel File</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload your existing <strong>QR- INVENTORY SYSTEM.xlsx</strong> file.
            The system will import all Print Master, Inward, Outward, and Container records.
          </p>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary'}`}
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => handleFile(e.target.files[0])} />
            {file ? (
              <div>
                <FileSpreadsheet size={36} className="text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-700">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div>
                <Upload size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Drop Excel file here or click to browse</p>
              </div>
            )}
          </div>

          {file && step === 'upload' && (
            <button onClick={handlePreview} disabled={loading} className="btn-primary w-full mt-4">
              {loading ? 'Analysing…' : 'Analyse File (Preview before import)'}
            </button>
          )}
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && preview && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-700 mb-3">Import Preview</h2>
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            {[
              { label: 'Items (RM Master)', value: preview.items, color: 'text-primary' },
              { label: 'Packs (Print Master)', value: preview.printMaster, color: 'text-primary' },
              { label: 'Inward Records', value: preview.inward, color: 'text-green-600' },
              { label: 'Outward Records', value: preview.outward, color: 'text-red-600' },
              { label: 'Containers', value: preview.containers, color: 'text-blue-600' },
              { label: 'Awaiting Inward', value: preview.awaitingInward, color: 'text-orange-500' },
            ].map((s) => (
              <div key={s.label} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-500">{s.label}</span>
                <span className={`font-bold ${s.color}`}>{s.value?.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {preview.negativeStockItems?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4">
              <div className="flex items-center gap-2 text-yellow-700 font-semibold mb-2">
                <AlertTriangle size={16} />
                {preview.negativeStockItems.length} items have negative stock (will import as-is):
              </div>
              <div className="text-xs space-y-1">
                {preview.negativeStockItems.map((i) => (
                  <div key={i.itemCode} className="text-yellow-700">
                    {i.itemName} [{i.itemCode}] — {i.bags} bags
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs text-blue-700 mb-4">
            ℹ️ Lot numbers will be cleaned and normalised. Legacy records are marked <code>is_legacy=true</code>.
            The stock ledger will be rebuilt from scratch after import.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">❌ {error}</div>
          )}

          <button onClick={handleExecute} disabled={loading}
            className="btn-success w-full">
            ✅ Confirm & Execute Import
          </button>
        </div>
      )}

      {/* Executing */}
      {step === 'executing' && (
        <div className="card text-center py-10">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-primary">Importing data…</p>
          <p className="text-sm text-gray-400 mt-1">This may take 2-5 minutes for large datasets. Please wait.</p>
        </div>
      )}

      {/* Done */}
      {step === 'done' && result && (
        <div className="card">
          <div className="flex items-center gap-2 text-green-700 font-bold text-lg mb-4">
            <CheckCircle size={24} />
            Import Complete!
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            {[
              { label: 'Items imported', value: result.rmInserted },
              { label: 'Packs imported', value: result.packsInserted },
              { label: 'Inward records', value: result.inwardInserted },
              { label: 'Outward records', value: result.outwardInserted },
              { label: 'Containers', value: result.containersInserted },
              { label: 'Ledger entries', value: result.ledgerEntries },
            ].map((s) => (
              <div key={s.label} className="bg-green-50 rounded-lg px-3 py-2 flex justify-between">
                <span className="text-gray-600">{s.label}</span>
                <span className="font-bold text-green-700">{s.value?.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {result.errors?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              <p className="text-yellow-700 font-semibold mb-2">⚠️ {result.errors.length} skipped records:</p>
              <div className="text-xs text-yellow-600 max-h-32 overflow-y-auto space-y-0.5">
                {result.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-4">
            Your inventory is now live. Go to <strong>Stock Dashboard</strong> to verify the data.
          </p>
        </div>
      )}
    </div>
  )
}
