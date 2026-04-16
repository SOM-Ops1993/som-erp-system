/**
 * Recipe DB — Excel-like editable grid
 * Supports bulk paste from Excel
 */
import { useState, useEffect, useRef } from 'react'
import { recipeApi, rmApi } from '../api/client'
import { BookOpen, Plus, Save, Trash2, ClipboardPaste } from 'lucide-react'

const EMPTY_ROW = (productCode = '', productName = '', batchUnit = 'Kg') => ({
  productCode, productName, batchUnit, rmCode: '', rmName: '', qtyPerUnit: '', uom: 'Kg', _new: true,
})

export default function RecipeDB() {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [rows, setRows] = useState([])
  const [rmItems, setRmItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [newProduct, setNewProduct] = useState({ code: '', name: '', unit: 'Kg' })
  const [showNewProduct, setShowNewProduct] = useState(false)
  const gridRef = useRef(null)

  useEffect(() => {
    recipeApi.products().then((r) => setProducts(r.data || []))
    rmApi.list().then((r) => setRmItems(r.data || []))
  }, [])

  const loadProduct = async (productCode) => {
    setSelectedProduct(productCode)
    if (!productCode) { setRows([]); return }
    const res = await recipeApi.list({ productCode })
    const loadedRows = res.data.map((r) => ({ ...r, qtyPerUnit: Number(r.qtyPerUnit), _new: false }))
    setRows([...loadedRows, EMPTY_ROW(productCode)])
  }

  const addRow = () => {
    const product = products.find((p) => p.product_code === selectedProduct)
    setRows((prev) => [...prev, EMPTY_ROW(selectedProduct, product?.product_name || '', product?.batch_unit || 'Kg')])
  }

  const updateRow = (idx, field, value) => {
    setRows((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      if (field === 'rmCode') {
        const rm = rmItems.find((r) => r.itemCode === value)
        if (rm) updated[idx] = { ...updated[idx], rmName: rm.itemName, uom: rm.uom }
      }
      return updated
    })
  }

  const deleteRow = async (idx) => {
    const row = rows[idx]
    if (!row._new && row.recipeId) {
      await recipeApi.deleteRow(row.recipeId)
    }
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  // Paste from Excel support
  const handleGridPaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    const pastedRows = text.trim().split('\n').map((line) => {
      const cols = line.split('\t')
      return {
        productCode: selectedProduct,
        productName: products.find((p) => p.product_code === selectedProduct)?.product_name || '',
        batchUnit: 'Kg',
        rmCode: cols[0]?.trim() || '',
        rmName: cols[1]?.trim() || '',
        qtyPerUnit: parseFloat(cols[2]) || 0,
        uom: cols[3]?.trim() || 'Kg',
        _new: true,
      }
    }).filter((r) => r.rmCode)

    setRows((prev) => {
      const existing = prev.filter((r) => !r._new)
      return [...existing, ...pastedRows, EMPTY_ROW(selectedProduct)]
    })
  }

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.rmCode && r.qtyPerUnit)
    if (validRows.length === 0) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await recipeApi.bulkSave(validRows.map((r) => ({
        productCode: r.productCode || selectedProduct,
        productName: r.productName || '',
        batchUnit: r.batchUnit || 'Kg',
        rmCode: r.rmCode,
        rmName: r.rmName,
        qtyPerUnit: parseFloat(r.qtyPerUnit),
        uom: r.uom || 'Kg',
      })))
      setSaveMsg(`✅ Saved ${validRows.length} rows`)
      loadProduct(selectedProduct)
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen size={24} className="text-primary" />
        <h1 className="text-xl font-bold text-primary">Recipe DB — Bill of Materials</h1>
      </div>

      {/* Product selector */}
      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-40">
            <label className="label">Product</label>
            <select className="input" value={selectedProduct} onChange={(e) => loadProduct(e.target.value)}>
              <option value="">— Select or create product —</option>
              {products.map((p) => (
                <option key={p.product_code} value={p.product_code}>
                  {p.product_name} [{p.product_code}]
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowNewProduct(!showNewProduct)} className="btn-outline text-sm">
            <Plus size={14} className="inline mr-1" />New Product
          </button>
        </div>

        {showNewProduct && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <input className="input" placeholder="Product Code *" value={newProduct.code}
              onChange={(e) => setNewProduct((p) => ({ ...p, code: e.target.value }))} />
            <input className="input" placeholder="Product Name *" value={newProduct.name}
              onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
            <div className="flex gap-2">
              <select className="input" value={newProduct.unit}
                onChange={(e) => setNewProduct((p) => ({ ...p, unit: e.target.value }))}>
                <option>Kg</option><option>L</option><option>Nos</option>
              </select>
              <button onClick={() => {
                if (newProduct.code && newProduct.name) {
                  loadProduct(newProduct.code)
                  setRows([EMPTY_ROW(newProduct.code, newProduct.name, newProduct.unit)])
                  setSelectedProduct(newProduct.code)
                  setShowNewProduct(false)
                }
              }} className="btn-primary text-sm whitespace-nowrap">Use</button>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      {selectedProduct && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
            <span className="text-sm font-semibold text-gray-600">
              {rows.filter((r) => r.rmCode).length} RM entries
            </span>
            <div className="flex gap-2">
              <button onClick={addRow} className="btn-outline text-xs flex items-center gap-1">
                <Plus size={12} /> Row
              </button>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <ClipboardPaste size={12} /> Paste from Excel supported
              </span>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs flex items-center gap-1">
                <Save size={12} /> {saving ? 'Saving…' : 'Save All'}
              </button>
            </div>
          </div>

          {saveMsg && (
            <div className={`px-4 py-2 text-sm ${saveMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {saveMsg}
            </div>
          )}

          <div className="overflow-x-auto" ref={gridRef} onPaste={handleGridPaste}>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">RM Code</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">RM Name</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Qty / Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">UOM</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Del</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className={`border-t ${row._new ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-3 py-1 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-2 py-1">
                      <select className="input text-xs py-1"
                        value={row.rmCode}
                        onChange={(e) => updateRow(idx, 'rmCode', e.target.value)}>
                        <option value="">— RM —</option>
                        {rmItems.map((r) => (
                          <option key={r.itemCode} value={r.itemCode}>{r.itemName} [{r.itemCode}]</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input className="input text-xs py-1" value={row.rmName}
                        onChange={(e) => updateRow(idx, 'rmName', e.target.value)}
                        placeholder="Auto-filled from RM code" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" step="0.0001" className="input text-xs py-1 text-right"
                        value={row.qtyPerUnit}
                        onChange={(e) => updateRow(idx, 'qtyPerUnit', e.target.value)}
                        placeholder="0.0000" />
                    </td>
                    <td className="px-2 py-1">
                      <select className="input text-xs py-1" value={row.uom}
                        onChange={(e) => updateRow(idx, 'uom', e.target.value)}>
                        <option>Kg</option><option>g</option><option>L</option><option>mL</option><option>Nos</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => deleteRow(idx)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
