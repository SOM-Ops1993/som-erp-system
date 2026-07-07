import { useState, useEffect, useCallback } from 'react'
import { recipeApi } from '../../../../../api/masters.js'
import { rmApi } from '../../../../../api/inventory.js'
import { planTasksApi } from '../../../../../api/production.js'
import { genId, incrCode, scaleToQty, state as printState } from '../../utils/bomPrintTemplates.js'
import { readArchivedBoms, readMeta, archiveBoms } from '../../utils/bomIssuanceStorage.js'
import { toCanonical } from '../../../../../utils/uom.js'
import { makeRows, toComponents, fromComponents } from '../components-table/ComponentsTable.jsx'
import IssueBomTab from '../issue-bom-tab/IssueBomTab.jsx'
import PreviewTab from '../preview-tab/PreviewTab.jsx'
import ArchiveTab from '../archive-tab/ArchiveTab.jsx'
import RecipeLibraryTab from '../recipe-library-tab/RecipeLibraryTab.jsx'
import { CheckCircle, AlertCircle, Loader, X, FileText, Eye, Archive, BookOpen } from 'lucide-react'

const TABS = [
  { id: 'issue',   label: 'Issue BOM',      icon: FileText },
  { id: 'preview', label: 'Preview',        icon: Eye },
  { id: 'archive', label: 'Archive',        icon: Archive },
  { id: 'recipes', label: 'Recipe Library', icon: BookOpen },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyForm = () => ({
  product: '', productCode: '',
  diNumber: '', shift: 'A', batchIncharge: '',
  batchNo: '', reactor: '', batchType: 'Commercial',
  batchSize: '', batchSizeUom: 'L',
  dateRequisition: todayISO(), datePlanned: '',
  remarks: '', section: '',
  cycles: 1,
})

const defaultSettings = () => ({
  showTotal: true, inclMasterSheet: true, skipCycleBOMs: false, sectionOnlyBMR: false,
  inclTechnical: false, inclFormulation: true, inclPacking: true, inclCOA: false, inclNano: false,
})

// recipe_db.qtyPerUnit is per 1 KG/L (canonical) of product — so scaleToQty's
// multiplier must be the batch size in that same canonical magnitude, not
// whatever unit the user picked. Entering "2 MT" must scale as 2000, not 2.
function canonicalBatchSize(batchSize, batchSizeUom) {
  const raw = parseFloat(batchSize) || 1
  try {
    return toCanonical(raw, batchSizeUom).qty
  } catch {
    return raw
  }
}

export default function BomIssuance() {
  const [activeTab, setActiveTab] = useState('issue')
  const [form, setForm]     = useState(emptyForm)
  const [rows, setRows]     = useState(() => makeRows(25))
  const [settings, setSettings] = useState(defaultSettings)
  const [previews, setPreviews] = useState([])
  const [error, setError]       = useState('')
  const [generating, setGenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [banner, setBanner]     = useState(null) // {type:'success'|'error', msg}

  const [recipeProducts, setRecipeProducts] = useState([])
  const [suggestions, setSuggestions]       = useState([])
  const [activeRecipe, setActiveRecipe]     = useState(null) // { productCode, perUnitComponents }
  const [recipeLoadedMsg, setRecipeLoadedMsg] = useState('')
  const [rmList, setRmList]                 = useState([])
  const [savingCorrections, setSavingCorrections] = useState(false)

  const [archivedBoms, setArchivedBoms] = useState(() => readArchivedBoms())
  const [meta, setMeta]                 = useState(() => readMeta())

  useEffect(() => {
    recipeApi.products().then(r => setRecipeProducts(r.data || [])).catch(() => {})
    rmApi.list({}).then(r => setRmList(r.data || [])).catch(() => {})
  }, [])

  // Keep the shared print-template settings singleton in sync with the React toggles.
  useEffect(() => { Object.assign(printState, settings) }, [settings])

  // Nano batches always get the 4 Nano batch report pages instead of the
  // generic Technical/Formulation/Packing/COA sheets — mirrors the legacy
  // tool's onSectionChange() behavior.
  useEffect(() => {
    setSettings(s => {
      if (form.section === 'Nano') {
        if (s.inclNano && !s.inclTechnical && !s.inclFormulation && !s.inclPacking && !s.inclCOA) return s
        return { ...s, inclNano: true, inclTechnical: false, inclFormulation: false, inclPacking: false, inclCOA: false }
      }
      if (!s.inclNano) return s
      return { ...s, inclNano: false }
    })
  }, [form.section])

  const onProductSearch = useCallback((val) => {
    if (!val.trim()) { setSuggestions([]); return }
    const q = val.toLowerCase()
    setSuggestions(recipeProducts.filter(p => p.productName?.toLowerCase().includes(q)).slice(0, 15))
  }, [recipeProducts])

  const onSelectProduct = useCallback(async (productCode, productName) => {
    setForm(f => ({ ...f, product: productName, productCode }))
    try {
      const r = await recipeApi.list({ productCode })
      const perUnit = (r.data || []).map(l => ({
        sno: '', component: l.rmName, qty: String(l.qtyPerUnit), uom: l.uom || '', remarks: l.roleType || '', isHeader: false,
        rmCode: l.rmCode,
      }))
      setActiveRecipe({ productCode, perUnit })
      const bsz = canonicalBatchSize(form.batchSize, form.batchSizeUom)
      const scaled = scaleToQty(perUnit, bsz)
      setRows(prev => fromComponents(scaled, prev.length))
      setRecipeLoadedMsg(`✓ Recipe loaded from Recipe Master · ${perUnit.length} components · scaled to ${form.batchSize} ${form.batchSizeUom}`)
    } catch (e) {
      setError('Failed to load recipe: ' + e.message)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.batchSize, form.batchSizeUom])

  // Auto-load the recipe whenever the Product Name field ends up holding an
  // exact match from the Recipe Master — not just when a suggestion is
  // clicked. This is what makes "Paste from Schedule" work too, since that
  // fills the field directly without ever going through the dropdown.
  useEffect(() => {
    const name = form.product.trim().toLowerCase()
    if (!name || !recipeProducts.length) return
    const match = recipeProducts.find(p => p.productName?.trim().toLowerCase() === name)
    if (match && match.productCode !== form.productCode) {
      onSelectProduct(match.productCode, match.productName)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product, form.productCode, recipeProducts])

  // Clear a stale "recipe loaded" message once the typed name no longer
  // matches the product it came from (e.g. user edits the field afterward).
  useEffect(() => {
    if (!form.productCode) setRecipeLoadedMsg('')
  }, [form.productCode])

  // Re-scale the loaded recipe whenever batch size changes
  useEffect(() => {
    if (!activeRecipe) return
    const bsz = canonicalBatchSize(form.batchSize, form.batchSizeUom)
    const scaled = scaleToQty(activeRecipe.perUnit, bsz)
    setRows(prev => fromComponents(scaled, prev.length))
    setRecipeLoadedMsg(`✓ Recipe scaled to ${form.batchSize} ${form.batchSizeUom} (stored per 1 unit)`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.batchSize, form.batchSizeUom])

  // Renames a recipe_db rmCode to the RM Master item the user's corrected
  // component text actually matched — same mechanism as Recipe Master's own
  // "Fix RM Mapping" tool, just surfaced here where the mismatch is spotted.
  // Reassigns every recipe row using the old code across all products, not
  // just the one currently loaded (the banner in ComponentsTable says so).
  const handleSaveCorrections = async (corrections) => {
    if (!corrections.length) return
    setSavingCorrections(true)
    setBanner({ type: 'loading', msg: `Saving ${corrections.length} correction(s) to Recipe Master…` })
    try {
      const res = await recipeApi.fixRmMapping(corrections)
      setBanner({ type: 'success', msg: `✓ ${res.totalFixed || 0} recipe row(s) updated across all products using the old code(s)` })
      setRows(prev => prev.map(r => {
        const hit = corrections.find(c => c.fromCode === r.rmCode)
        return hit ? { ...r, rmCode: hit.toCode } : r
      }))
      rmApi.list({}).then(r => setRmList(r.data || [])).catch(() => {})
    } catch (e) {
      setBanner({ type: 'error', msg: `Failed to save corrections: ${e.message}` })
    } finally {
      setSavingCorrections(false)
    }
  }

  const onGenerate = () => {
    setError('')
    const pn = form.product.trim()
    const comps = toComponents(rows)
    if (!pn) return setError('Product name is required')
    if (!form.section) return setError('Select the plant this batch will be produced in')
    if (!comps.length) return setError('Add at least one component')

    setGenerating(true)
    const n = Math.max(1, parseInt(form.cycles, 10) || 1)
    const batchBase = form.batchNo.trim() || 'BAT/001'
    // BOM No is no longer entered by hand — auto-generated from today's date
    // plus a short random tag, then incremented per cycle like the batch no.
    const bomBase = `BOM-${form.dateRequisition.replace(/-/g, '')}-${genId().slice(0, 4).toUpperCase()}-001`
    const built = Array.from({ length: n }, (_, i) => ({
      id: genId(),
      bomNo: incrCode(bomBase, i),
      batchNo: incrCode(batchBase, i),
      productName: pn, batchSize: form.batchSize, batchSizeUom: form.batchSizeUom,
      diNumber: form.diNumber, batchType: form.batchType,
      dateRequisition: form.dateRequisition, datePlanned: form.datePlanned,
      shift: form.shift, batchIncharge: form.batchIncharge, reactor: form.reactor,
      remarks: form.remarks, components: comps, section: form.section,
      cycleNo: i + 1, totalCycles: n,
      issuedAt: new Date().toISOString(),
    }))
    setPreviews(built)
    setGenerating(false)
    setActiveTab('preview')
  }

  const onConfirm = async () => {
    if (!previews.length) return
    setConfirming(true)
    setBanner({ type: 'loading', msg: `Creating ${previews.length} production task(s)…` })
    try {
      for (const bom of previews) {
        const plant = bom.section
        const date  = bom.datePlanned || new Date().toISOString().slice(0, 10)
        await planTasksApi.create({
          plant, date,
          productName: bom.productName,
          batchCode:   bom.batchNo || null,
          qty:         parseFloat(bom.batchSize) || 0,
          qtyUom:      bom.batchSizeUom || 'KG',
          diNo:        bom.diNumber || null,
          shift:       bom.shift || 'General',
          incharge:    bom.batchIncharge || '',
          equipment:   bom.reactor || null,
          process:     'Formulation',
          remarks:     [bom.bomNo, bom.remarks].filter(Boolean).join(' · ') || null,
          sent:        true,
        })
      }
      const newMeta = archiveBoms(previews)
      setArchivedBoms(readArchivedBoms())
      setMeta(newMeta)
      setBanner({ type: 'success', msg: `✓ ${previews.length} production task(s) created — visible in Store Outward → Material Issue by BOM` })

      // Clear the form for the next entry
      setForm(emptyForm())
      setRows(makeRows(25))
      setActiveRecipe(null)
      setRecipeLoadedMsg('')
      setPreviews([])
      setActiveTab('issue')
    } catch (e) {
      setBanner({ type: 'error', msg: `Failed to create tasks: ${e.message}` })
    } finally {
      setConfirming(false)
    }
  }

  const bannerCls = {
    loading: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50 border-red-200 text-red-700',
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {banner && (
        <div className={`px-5 py-2.5 border-b flex items-center gap-2 text-[13px] font-medium flex-shrink-0 ${bannerCls[banner.type]}`}>
          {banner.type === 'loading' && <Loader size={14} className="animate-spin flex-shrink-0" />}
          {banner.type === 'success' && <CheckCircle size={14} className="flex-shrink-0" />}
          {banner.type === 'error'   && <AlertCircle size={14} className="flex-shrink-0" />}
          <span>{banner.msg}</span>
          {banner.type !== 'loading' && (
            <button onClick={() => setBanner(null)} className="ml-auto opacity-60 hover:opacity-100 flex-shrink-0"><X size={14} /></button>
          )}
        </div>
      )}

      <div className="bg-white border-b border-slate-200 flex px-6 overflow-x-auto flex-shrink-0 gap-1">
        {TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors
                ${active ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-200'}`}>
              <Icon size={14.5} />
              {t.label}
              {t.id === 'preview' && previews.length > 0 && (
                <span className="ml-0.5 text-[10.5px] font-bold bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5">{previews.length}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'issue' && (
          <IssueBomTab
            form={form} setForm={setForm} rows={rows} setRows={setRows}
            settings={settings} setSettings={setSettings}
            productSuggestions={suggestions} onProductSearch={onProductSearch} onSelectProduct={onSelectProduct}
            recipeLoadedMsg={recipeLoadedMsg}
            onGenerate={onGenerate} generating={generating} error={error}
            rmList={rmList} onSaveCorrections={handleSaveCorrections} savingCorrections={savingCorrections}
          />
        )}
        {activeTab === 'preview' && (
          <PreviewTab previews={previews} onBack={() => setActiveTab('issue')} onConfirm={onConfirm} confirming={confirming} />
        )}
        {activeTab === 'archive' && (
          <ArchiveTab boms={archivedBoms} recipeCount={recipeProducts.length} meta={meta} />
        )}
        {activeTab === 'recipes' && <RecipeLibraryTab />}
      </div>
    </div>
  )
}
