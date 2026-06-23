import { useState, useEffect } from 'react'
import { recipeApi, productApi } from '../../../../api/masters.js'
import { rmApi } from '../../../../api/inventory.js'
import ProductSidebar    from '../components/ProductSidebar.jsx'
import BomEditor         from '../components/BomEditor.jsx'
import RecipeImportModal from '../components/RecipeImportModal.jsx'
import ReconcileModal    from '../components/ReconcileModal.jsx'

const EMPTY_ROW = () => ({ id: null, rmCode: '', rmName: '', qtyPerUnit: '', uom: 'KG', roleType: 'INGREDIENT', _dirty: true })

export default function RecipeDB() {
  const [productList, setProductList]     = useState([])
  const [rmList, setRmList]               = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [bomRows, setBomRows]             = useState([])
  const [prodSearch, setProdSearch]       = useState('')
  const [loading, setLoading]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [msg, setMsg]                     = useState({ type: '', text: '' })

  const [importModal, setImportModal]     = useState(false)
  const [reconcileModal, setReconcileModal] = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [rmRes, prodRes] = await Promise.all([rmApi.list({}), productApi.list({})])
      setRmList(rmRes.data || [])
      setProductList(prodRes.data || [])
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
    setLoading(false)
  }

  const selectProduct = async (prod) => {
    setSelectedProduct(prod)
    setProdSearch('')
    setMsg({ type: '', text: '' })
    try {
      const res  = await recipeApi.list({ productCode: prod.productCode })
      const data = res.data || []
      setBomRows(data.length > 0 ? data.map(r => ({ ...r, _dirty: false })) : [EMPTY_ROW()])
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
  }

  const updateRow = (idx, field, value) => {
    setBomRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, _dirty: true } : r))
  }

  const selectRm = (idx, rm) => {
    setBomRows(prev => prev.map((r, i) =>
      i === idx ? { ...r, rmCode: rm.itemCode, rmName: rm.itemName, uom: rm.uom, _dirty: true } : r
    ))
  }

  const addRow = () => setBomRows(prev => [...prev, EMPTY_ROW()])

  const removeRow = async (idx) => {
    const row = bomRows[idx]
    if (row.id && !confirm('Delete this RM from recipe?')) return
    if (row.id) {
      try { await recipeApi.deleteRow(row.id) }
      catch (e) { alert(e.message); return }
    }
    setBomRows(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      return updated.length === 0 ? [EMPTY_ROW()] : updated
    })
  }

  const saveAll = async () => {
    if (!selectedProduct) { setMsg({ type: 'error', text: 'Select a product first' }); return }
    const toSave = bomRows.filter(r => r._dirty && r.rmCode && r.qtyPerUnit)
    if (toSave.length === 0) { setMsg({ type: 'error', text: 'No rows to save. Fill RM and Qty.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const payload = toSave.map(r => ({
        productCode: selectedProduct.productCode,
        productName: selectedProduct.productName,
        rmCode: r.rmCode, rmName: r.rmName,
        qtyPerUnit: r.qtyPerUnit, uom: r.uom,
        roleType: r.roleType || 'INGREDIENT',
      }))
      const res = await recipeApi.bulkSave(payload)
      setMsg({ type: 'success', text: `✅ ${res.saved} rows saved` })
      await selectProduct(selectedProduct)
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
    setSaving(false)
  }

  const handleImportDone = async (res) => {
    setMsg({
      type: 'success',
      text: `✅ Import done — Products: ${res.data?.productMaster || 0}, RM Items: ${res.data?.rmMaster || 0}, Recipe lines: ${res.data?.recipeBom || 0}`,
    })
    await loadAll()
    if (selectedProduct) await selectProduct(selectedProduct)
  }

  const handleFixedDone = async () => {
    await loadAll()
    if (selectedProduct) await selectProduct(selectedProduct)
  }

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 0px)' }}>
      <ProductSidebar
        productList={productList}
        loading={loading}
        selectedProduct={selectedProduct}
        prodSearch={prodSearch}
        onSearchChange={setProdSearch}
        onSelectProduct={selectProduct}
        onImport={() => setImportModal(true)}
        onReconcile={() => setReconcileModal(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <BomEditor
          selectedProduct={selectedProduct}
          bomRows={bomRows}
          rmList={rmList}
          saving={saving}
          msg={msg}
          onAddRow={addRow}
          onSaveAll={saveAll}
          onUpdateRow={updateRow}
          onSelectRm={selectRm}
          onRemoveRow={removeRow}
          onImportClick={() => setImportModal(true)}
        />
      </main>

      {importModal && (
        <RecipeImportModal
          onClose={() => setImportModal(false)}
          onDone={handleImportDone}
        />
      )}

      {reconcileModal && (
        <ReconcileModal
          onClose={() => setReconcileModal(false)}
          onFixed={handleFixedDone}
        />
      )}
    </div>
  )
}
