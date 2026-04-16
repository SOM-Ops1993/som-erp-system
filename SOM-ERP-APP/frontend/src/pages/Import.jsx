import { useState, useRef } from 'react'
import { importApi } from '../api/client.js'

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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Legacy Data</h1>
      <p className="text-gray-500 text-sm mb-6">Upload your existing Excel file to bring historical data into the system</p>

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
        <button onClick={analyze} disabled={!file || loading}
          className="flex-1 border-2 border-blue-500 text-blue-600 py-3 rounded-lg hover:bg-blue-50 font-semibold disabled:opacity-50">
          {loading ? '🔍 Analyzing...' : '🔍 Analyze & Preview'}
        </button>
        <button onClick={execute} disabled={!file || executing}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50">
          {executing ? '⬆️ Importing...' : '⬆️ Import to Database'}
        </button>
      </div>

      {/* Preview results */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">📋 File Preview</h2>
          <p className="text-sm text-gray-500 mb-3">{preview.totalSheets} sheet(s) found: {preview.sheets.join(', ')}</p>
          {Object.entries(preview.summary).map(([sheet, info]) => (
            <div key={sheet} className="mb-4">
              <div className="font-semibold text-gray-800 mb-1">Sheet: {sheet} ({info.rowCount} rows)</div>
              <div className="text-xs text-gray-500 mb-2">Columns: {info.columns.join(', ')}</div>
              {info.sample.length > 0 && (
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
          ))}
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mt-3 text-sm text-blue-800">
            ✅ File looks good. Click <strong>"Import to Database"</strong> to load this data.
          </div>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="font-bold text-green-900 mb-3">✅ Import Complete</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <ResultCard label="Products Added" value={result.productMaster} color="text-violet-700" />
            <ResultCard label="Equipment Added" value={result.equipmentMaster} color="text-blue-700" />
            <ResultCard label="RM Items" value={result.rmMaster} color="text-green-700" />
            <ResultCard label="Recipe/BOM Lines" value={result.recipeBom} color="text-teal-700" />
            <ResultCard label="Packs Imported" value={result.printMaster} color="text-indigo-700" />
            <ResultCard label="Inward Records" value={result.inward} color="text-orange-700" />
            <ResultCard label="Outward Records" value={result.outward} color="text-red-700" />
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm font-medium mb-1">⚠️ {result.errors.length} row-level warning(s):</p>
              {result.errors.slice(0, 8).map((e, i) => <p key={i} className="text-yellow-700 text-xs">{e}</p>)}
              {result.errors.length > 8 && <p className="text-yellow-600 text-xs mt-1">…and {result.errors.length - 8} more</p>}
            </div>
          )}
        </div>
      )}

      {/* Format Guide */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">📌 Excel File Format Guide</h3>
          <p className="text-xs text-gray-500 mt-0.5">One Excel file can have multiple sheets — the system auto-detects each by sheet name</p>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            {
              sheet: 'Product Master',
              match: 'Sheet name contains "product" (not recipe/equipment)',
              cols: [
                { name: 'Product Name', note: 'Required. Duplicate names are skipped.' },
                { name: 'Plant Name', note: 'Optional. Plant where this product is manufactured.' },
              ],
              note: 'Product Code is auto-generated (PROD-001, PROD-002…) if not provided.'
            },
            {
              sheet: 'Equipment Master',
              match: 'Sheet name contains "equipment" or "equip"',
              cols: [
                { name: 'Equipment Name', note: 'Required. Unique name for each equipment.' },
                { name: 'Working Volume', note: 'Numeric. Capacity of the equipment (e.g. 500).' },
                { name: 'Operation', note: 'Type of operation (e.g. Granulation, Blending).' },
                { name: 'Plant', note: 'Plant where this equipment is located.' },
              ],
              note: 'Equipment Name is used as the unique key — existing records are updated.'
            },
            {
              sheet: 'RM Master',
              match: 'Sheet name contains "RM" or "Material" (not product/recipe)',
              cols: [
                { name: 'Item Code', note: 'Required. Unique RM code.' },
                { name: 'Item Name', note: 'Required. RM description.' },
                { name: 'UOM', note: 'Unit of measure (KG, L, etc.).' },
              ],
              note: null
            },
            {
              sheet: 'Recipe / BOM',
              match: 'Sheet name contains "recipe", "bom", "formula"',
              cols: [
                { name: 'Product Name', note: 'Required. Product (FG) this BOM belongs to.' },
                { name: 'Raw Material Name', note: 'Required. RM ingredient.' },
                { name: 'Qty Per Unit', note: 'Required. Qty of RM per unit of product.' },
                { name: 'UOM', note: 'Unit of measure for the RM qty.' },
              ],
              note: 'Products and RMs not yet in the system are auto-created with generated codes.'
            },
            {
              sheet: 'Print Master (Pack Stock)',
              match: 'Sheet name contains "print" or "pack master"',
              cols: [
                { name: 'Pack ID', note: 'Required. Unique ID for each bag/pack.' },
                { name: 'Item Code', note: 'Required. RM code this pack belongs to.' },
                { name: 'Lot No', note: 'Lot or batch code.' },
                { name: 'Bag No', note: 'Bag number within the lot.' },
                { name: 'Pack Qty', note: 'Quantity in this pack.' },
                { name: 'UOM', note: 'Unit of measure.' },
                { name: 'Supplier', note: 'Optional.' },
                { name: 'Invoice No', note: 'Optional.' },
                { name: 'Received Date', note: 'Optional date.' },
                { name: 'Status', note: 'Set "INWARDED" for stock already received.' },
              ],
              note: null
            },
            {
              sheet: 'Inward',
              match: 'Sheet name contains "inward" or "GRN" or "goods received"',
              cols: [
                { name: 'Pack ID', note: 'Required. Must already exist in Print Master.' },
                { name: 'Warehouse', note: 'Location where inward is done.' },
                { name: 'Date', note: 'Date of inward.' },
              ],
              note: null
            },
          ].map(s => (
            <div key={s.sheet} className="px-5 py-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-semibold text-gray-800">{s.sheet}</span>
                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{s.match}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-2">
                {s.cols.map(c => (
                  <div key={c.name} className="flex gap-2 text-xs">
                    <span className="font-semibold text-gray-700 min-w-[120px] shrink-0">{c.name}</span>
                    <span className="text-gray-500">{c.note}</span>
                  </div>
                ))}
              </div>
              {s.note && <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded mt-1">{s.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-green-200">
      <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
      <div className="text-gray-600 text-xs mt-0.5">{label}</div>
    </div>
  )
}
