import { useState, useEffect, useRef, useCallback } from 'react'
import { outwardApi, containerApi } from '../../../../../../api/inventory.js'
import { recipeApi, productApi } from '../../../../../../api/masters.js'
import { planTasksApi, indentApi } from '../../../../../../api/production.js'
import QRScanner from '../../../../../../components/QRScanner/QRScanner.jsx'
import { Button, BackButton, IconButton } from '../../../../../../components/ui'
import { Camera, X } from 'lucide-react'
import { readSessions, saveSession, deleteSession } from './bomSessions.js'
import { readIssuedKeys, markIssued } from './issuedTasks.js'
import './MaterialIssueByBOM.css'

export default function MaterialIssueByBOM({ resumeSessionId, onAutoResumed }) {
  // �"?�"? Step / product selection �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const [step, setStep]             = useState('select')
  const [products, setProducts]     = useState([])
  const [prodSearch, setProdSearch] = useState('')
  const [selProduct, setSelProduct] = useState(null)
  const [selTaskId, setSelTaskId]   = useState(null)
  const [batchQty, setBatchQty]     = useState('')
  const [batchRef, setBatchRef]     = useState('')
  const [diNo,     setDiNo]         = useState('')
  const [loadingBom, setLoadingBom] = useState(false)
  const [error, setError]           = useState('')

  // Production task picker
  const [tasks,        setTasks]        = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [taskFilter,   setTaskFilter]   = useState({ plant: '', date: new Date().toISOString().slice(0, 10) })
  const [issuedKeys,   setIssuedKeys]   = useState(() => readIssuedKeys())

  // �"?�"? Session �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const [sessionId, setSessionId] = useState(null)

  // �"?�"? BOM �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const [bomLines, setBomLines] = useState([])

  // �"?�"? Issue panel �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const [activeIdx, setActiveIdx]   = useState(null)
  // pre-loaded silently for scan matching (never shown as dropdowns)
  const [packs, setPacks]           = useState([])
  const [containers, setContainers] = useState([])
  const [loadingRes, setLoadingRes] = useState(false)
  // scan state
  const [scanInput, setScanInput]   = useState('')
  const [scanErr, setScanErr]       = useState('')
  const [foundSource, setFoundSource] = useState(null)
  // foundSource: { type:'pack'|'container', id, availableQty, uom, lotNo?, bagNo?, supplier?, itemName? }
  const [issueQty, setIssueQty]     = useState('')
  const [issuing, setIssuing]       = useState(false)
  const [issueError, setIssueError] = useState('')
  const [lineMsg, setLineMsg]       = useState({})
  const [showScanner, setShowScanner] = useState(false)

  const scanInputRef = useRef(null)

  // Load products
  useEffect(() => {
    productApi.list().then(r => setProducts(r.data || [])).catch(() => {})
  }, [])

  // Load production tasks
  useEffect(() => {
    setLoadingTasks(true)
    planTasksApi.list().then(r => setTasks(r.data || [])).catch(() => {}).finally(() => setLoadingTasks(false))
  }, [])

  const filteredTasks = tasks.filter(t =>
    t.sent &&
    t.status !== 'Completed' &&
    !issuedKeys.has(t.id) &&
    (!taskFilter.plant || t.plant === taskFilter.plant) &&
    (!taskFilter.date  || t.date  === taskFilter.date)
  )

  function selectTask(task) {
    const match = products.find(p =>
      p.productName?.toLowerCase() === task.productName?.toLowerCase() ||
      (task.productCode && p.productCode === task.productCode)
    )
    setSelProduct(match || { productCode: task.productCode || '', productName: task.productName })
    setBatchQty(String(task.qty || ''))
    setBatchRef(task.batchCode || task.taskId || '')
    setDiNo(task.diNo || '')
    setSelTaskId(task.id)
    setError('')
  }

  // Auto-save on every bomLines change
  useEffect(() => {
    if (!sessionId || step !== 'bom') return
    saveSession({
      id: sessionId,
      productCode: selProduct?.productCode || '',
      productName: selProduct?.productName || '',
      batchQty, batchRef, diNo,
      startedAt: readSessions().find(s => s.id === sessionId)?.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bomLines,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomLines, sessionId])

  // Auto-focus scan input when panel opens
  useEffect(() => {
    if (activeIdx !== null) {
      const t = setTimeout(() => scanInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [activeIdx])

  const filteredProducts = products.filter(p =>
    !prodSearch ||
    p.productName?.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.productCode?.toLowerCase().includes(prodSearch.toLowerCase())
  )

  // �"?�"? Load BOM �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const loadBom = async () => {
    if (!selProduct || !batchQty || parseFloat(batchQty) <= 0) return
    setLoadingBom(true); setError('')
    try {
      const res = await recipeApi.list({ productCode: selProduct.productCode })
      const raw = res.data || []
      if (raw.length === 0) {
        setError('No BOM found for this product. Add recipe lines in Recipe Master first.')
        setLoadingBom(false); return
      }
      const batch = parseFloat(batchQty)
      const lines = raw.map(r => ({
        rmCode:     r.rmCode,
        rmName:     r.rmName,
        qtyPerUnit: parseFloat(r.qtyPerUnit),
        required:   parseFloat((r.qtyPerUnit * batch).toFixed(3)),
        issued:     0,
        uom:        r.uom || 'KG',
        roleType:   r.roleType || 'INGREDIENT',
      }))
      const id = Date.now().toString()
      setSessionId(id)
      setBomLines(lines)
      setActiveIdx(null)
      setLineMsg({})
      setStep('bom')
      markIssued(selTaskId)
      setIssuedKeys(readIssuedKeys())
    } catch (e) { setError(e.message) }
    finally { setLoadingBom(false) }
  }

  // �"?�"? Resume session �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const resumeSession = (s) => {
    setSelProduct({ productCode: s.productCode, productName: s.productName })
    setBatchQty(s.batchQty)
    setBatchRef(s.batchRef || '')
    setDiNo(s.diNo || '')
    setBomLines(s.bomLines)
    setSessionId(s.id)
    setSelTaskId(null)
    setActiveIdx(null)
    setLineMsg({})
    setError('')
    setStep('bom')
  }

  // Resume a session requested from outside (e.g. the BOM Issued history page)
  useEffect(() => {
    if (!resumeSessionId) return
    const s = readSessions().find(x => x.id === resumeSessionId)
    if (s) resumeSession(s)
    onAutoResumed?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId])

  // �"?�"? Load packs + containers silently (for scan matching only) �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const loadResources = useCallback(async (rmCode) => {
    setLoadingRes(true)
    setScanInput(''); setScanErr(''); setFoundSource(null); setIssueQty(''); setIssueError('')
    try {
      const [packsRes, contsRes] = await Promise.allSettled([
        outwardApi.availablePacks(rmCode),
        containerApi.list({ itemCode: rmCode }),
      ])
      setPacks(packsRes.status === 'fulfilled' ? (packsRes.value.data || []) : [])
      setContainers(
        contsRes.status === 'fulfilled'
          ? (contsRes.value.data || []).filter(c => c.currentQty > 0)
          : []
      )
    } finally { setLoadingRes(false) }
  }, [])

  const openIssuePanel = async (idx) => {
    if (activeIdx === idx) { setActiveIdx(null); return }
    setActiveIdx(idx)
    setIssueError('')
    setLineMsg(prev => ({ ...prev, [idx]: '' }))
    await loadResources(bomLines[idx].rmCode)
  }

  // �"?�"? Unified scan handler �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const handleScan = useCallback((rawValue) => {
    const val = rawValue.trim()
    if (!val) return
    setScanInput(val)
    setScanErr('')
    setFoundSource(null)
    setIssueError('')

    const line = bomLines[activeIdx]
    if (!line) return
    const remaining = parseFloat((line.required - line.issued).toFixed(3))

    // Container QR encodes "CONT:{containerId}"
    if (val.startsWith('CONT:')) {
      const containerId = val.slice(5)
      const cont = containers.find(c => c.containerId === containerId)
      if (cont) {
        setFoundSource({ type: 'container', id: cont.containerId, availableQty: cont.currentQty, uom: cont.uom || line.uom, itemName: cont.itemName })
        setIssueQty(String(Math.min(remaining, cont.currentQty).toFixed(3)))
      } else {
        setScanErr(`Container "${containerId}" has no stock for ${line.rmName}. Check the container or inward stock first.`)
      }
      return
    }

    // Pack QR encodes raw packId
    const pack = packs.find(p => p.packId === val)
    if (pack) {
      setFoundSource({ type: 'pack', id: pack.packId, availableQty: pack.remainingQty, uom: line.uom, lotNo: pack.lotNo, bagNo: pack.bagNo, supplier: pack.supplier })
      setIssueQty(String(Math.min(remaining, pack.remainingQty).toFixed(3)))
      return
    }

    setScanErr(`"${val}" not found for ${line.rmName}. Scan the correct pack or container QR code.`)
  }, [bomLines, activeIdx, packs, containers])

  // QR camera callback — closes modal then processes value
  const onQRScan = useCallback((value) => {
    setShowScanner(false)
    handleScan(value)
  }, [handleScan])

  // �"?�"? Submit issue �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const submitIssue = async () => {
    const line = bomLines[activeIdx]
    const qty  = parseFloat(issueQty)
    if (!foundSource) { setIssueError('Scan a pack or container QR code first'); return }
    if (!qty || qty <= 0) { setIssueError('Enter a valid quantity'); return }
    if (qty > foundSource.availableQty) { setIssueError(`Qty exceeds available stock (${foundSource.availableQty} ${foundSource.uom})`); return }

    setIssuing(true); setIssueError('')
    try {
      await outwardApi.bomDirect({
        source:      foundSource.type,
        sourceId:    foundSource.id,
        qty,
        rmCode:      line.rmCode,
        productCode: selProduct.productCode,
        productName: selProduct.productName,
        batchSize:   parseFloat(batchQty),
        batchRef,
      })

      const newIssued  = parseFloat((line.issued + qty).toFixed(3))
      const updatedLines = bomLines.map((l, i) =>
        i === activeIdx ? { ...l, issued: newIssued } : l
      )
      setBomLines(updatedLines)
      setLineMsg(prev => ({
        ...prev,
        [activeIdx]: `Issued ${qty} ${line.uom} from ${foundSource.type === 'pack' ? 'Pack' : 'Container'}: ${foundSource.id}`,
      }))

      const remaining = parseFloat((line.required - newIssued).toFixed(3))
      if (remaining <= 0.001) {
        setActiveIdx(null)
        if (updatedLines.every(l => l.issued >= l.required - 0.001)) deleteSession(sessionId)
      } else {
        // More qty needed — reset scan, keep panel open
        setScanInput(''); setFoundSource(null); setScanErr(''); setIssueQty(String(remaining.toFixed(3)))
        await loadResources(line.rmCode)
      }
    } catch (e) { setIssueError(e.message) }
    finally { setIssuing(false) }
  }

  // �"?�"? Derived �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  const totalRequired = bomLines.length
  const totalDone     = bomLines.filter(l => l.issued >= l.required - 0.001).length
  const progress      = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0

  // �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  // STEP: SELECT
  // �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?


  if (step === 'select') {
    return (
      <div className="p-4 md:p-6 max-w-3xl">

        <p className="text-sm text-gray-500 mb-5">
          Select a production task to issue raw materials by BOM. Progress is auto-saved — you can leave and resume any time.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* Task picker filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <select value={taskFilter.plant} onChange={e => setTaskFilter(f => ({ ...f, plant: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All Plants</option>
            {['Nano', 'Botanical', 'Liquid', 'Powder', 'Granules'].map(p => <option key={p}>{p}</option>)}
          </select>
          <input type="date" value={taskFilter.date} onChange={e => setTaskFilter(f => ({ ...f, date: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Task list */}
        {loadingTasks ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center mb-4">
            <p className="text-sm text-gray-500 font-medium">No active tasks for selected date / plant</p>
            <p className="text-xs text-gray-400 mt-1">Tasks must be sent from the Planning page first</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {filteredTasks.map(task => {
              const isSelected = selProduct?.productName === task.productName && batchQty === String(task.qty)
              return (
                <button key={task.id} type="button"
                  onClick={() => selectTask(task)}
                  className={`w-full text-left border rounded-xl px-4 py-3 transition hover:border-indigo-400 hover:bg-indigo-50/60 ${
                    isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{task.productName}</div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-400">
                        <span className="font-medium text-gray-600">{task.qty} {task.qtyUom || 'KG'}</span>
                        {task.batchCode && <span className="font-mono">{task.batchCode}</span>}
                        {task.diNo      && <span>{task.diNo}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{task.plant}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        task.status === 'Under Process' ? 'bg-blue-100 text-blue-700' :
                        task.status === 'Not Started'   ? 'bg-gray-100 text-gray-500'  :
                                                          'bg-amber-100 text-amber-700'
                      }`}>{task.status}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Selected task summary */}
        {selProduct && (
          <div className="mb-4 flex items-center gap-2 flex-wrap bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            <span className="text-sm font-semibold text-indigo-900 truncate max-w-full">{selProduct.productName}</span>
            <span className="text-xs text-indigo-500 flex-shrink-0">· {batchQty} KG</span>
            {batchRef && <span className="text-xs font-mono text-gray-400 truncate">· {batchRef}</span>}
            <IconButton icon={X} onClick={() => { setSelProduct(null); setBatchQty(''); setBatchRef(''); setSelTaskId(null) }} variant="ghost" size="xs" tooltip="Clear" className="ml-auto flex-shrink-0" />
          </div>
        )}

        <Button onClick={loadBom}
          disabled={loadingBom || !selProduct || !batchQty || parseFloat(batchQty) <= 0}
          loading={loadingBom}
          variant="purple"
          fullWidth>
          {loadingBom ? 'Loading BOM...' : 'Load BOM & Start Issuing'}
        </Button>
      </div>
    )
  }

  // �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  // STEP: BOM checklist
  // �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
  return (
    <>
      {showScanner && (
        <QRScanner
          label="Scan Pack or Container QR Code"
          onScan={onQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{selProduct?.productName}</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">
                {batchQty} KG
              </span>
              {batchRef && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg font-mono">{batchRef}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {totalDone}/{totalRequired} materials issued
              {progress === 100
                ? <span className="text-green-600 font-bold ml-2">— All Done!</span>
                : <span className="text-gray-400 ml-2">· Progress auto-saved</span>
              }
            </p>
          </div>
          <BackButton onClick={() => { setStep('select'); setActiveIdx(null) }} size="sm" label="Back" />
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Status matrix */}
        {bomLines.length > 0 && (() => {
          const pending   = bomLines.filter(l => l.issued <= 0).length
          const partial   = bomLines.filter(l => l.issued > 0 && (l.required - l.issued) > 0.001).length
          const complete  = bomLines.filter(l => (l.required - l.issued) <= 0.001).length
          return (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-2 sm:px-4 py-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{pending}</p>
                <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5">Pending</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-2 sm:px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{partial}</p>
                <p className="text-[11px] sm:text-xs font-medium text-amber-600 mt-0.5">Partially Issued</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl px-2 sm:px-4 py-3 text-center">
                <p className="text-2xl font-bold text-green-700">{complete}</p>
                <p className="text-xs font-medium text-green-600 mt-0.5">Fully Issued</p>
              </div>
            </div>
          )
        })()}

        {/* BOM rows */}
        <div className="space-y-2">
          {bomLines.map((line, idx) => {
            const remaining = Math.max(0, parseFloat((line.required - line.issued).toFixed(3)))
            const done      = remaining <= 0.001
            const partial   = line.issued > 0 && !done
            const isActive  = activeIdx === idx
            const pct       = Math.min(100, Math.round((line.issued / line.required) * 100))

            return (
              <div key={`${line.rmCode}-${idx}`}
                className={`border rounded-xl overflow-hidden transition-all ${
                  done     ? 'border-green-200 bg-green-50' :
                  isActive ? 'border-indigo-400 shadow-sm bg-white' :
                             'border-gray-200 bg-white'
                }`}>

                {/* Row summary */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    done    ? 'bg-green-500 text-white' :
                    partial ? 'bg-amber-400 text-white' :
                              'bg-gray-200 text-gray-600'
                  }`}>{done ? '�o"' : idx + 1}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{line.rmName}</span>
                      <span className="text-xs font-mono text-gray-400">{line.rmCode}</span>
                      {line.roleType !== 'INGREDIENT' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          line.roleType === 'MICROBE'  ? 'bg-emerald-100 text-emerald-700' :
                          line.roleType === 'CARRIER'  ? 'bg-purple-100 text-purple-700'  :
                                                         'bg-blue-100 text-blue-700'
                        }`}>{line.roleType}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span>Required: <strong className="text-gray-800">{line.required} {line.uom}</strong></span>
                      <span>Issued: <strong className={line.issued > 0 ? 'text-green-700' : 'text-gray-400'}>
                        {line.issued} {line.uom}
                      </strong></span>
                      {!done && remaining > 0 && (
                        <span>Remaining: <strong className="text-red-600">{remaining} {line.uom}</strong></span>
                      )}
                    </div>
                    {lineMsg[idx] && (
                      <p className="text-xs text-green-600 mt-0.5 font-medium">�o" {lineMsg[idx]}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-14 hidden sm:block">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-center text-gray-400 mt-0.5">{pct}%</div>
                  </div>

                  {done ? (
                    <span className="text-xs font-bold text-green-600 px-2.5 py-1 bg-green-100 rounded-lg flex-shrink-0">
                      Done �o"
                    </span>
                  ) : (
                    <Button onClick={() => openIssuePanel(idx)}
                      variant={isActive ? 'secondary' : 'purple'}
                      size="xs"
                      className="flex-shrink-0">
                      {isActive ? '→ Close' : partial ? 'Issue More' : 'Issue �?-'}
                    </Button>
                  )}
                </div>

                {/* Issue panel */}
                {isActive && !done && (
                  <IssuePanel
                    line={line}
                    remaining={remaining}
                    packs={packs}
                    containers={containers}
                    loadingRes={loadingRes}
                    scanInput={scanInput}
                    setScanInput={setScanInput}
                    scanInputRef={scanInputRef}
                    scanErr={scanErr}
                    setScanErr={setScanErr}
                    foundSource={foundSource}
                    setFoundSource={setFoundSource}
                    issueQty={issueQty}
                    setIssueQty={setIssueQty}
                    issuing={issuing}
                    issueError={issueError}
                    onScanInput={handleScan}
                    onOpenScanner={() => setShowScanner(true)}
                    onSubmit={submitIssue}
                    bomLines={bomLines}
                    activeIdx={idx}
                    selProduct={selProduct}
                    batchQty={batchQty}
                    batchRef={batchRef}
                    diNo={diNo}
                  />
                )}
              </div>
            )
          })}
        </div>

        {progress === 100 && (
          <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="text-2xl mb-2">�YZ?</p>
            <p className="font-bold text-green-800 text-lg">All Materials Issued!</p>
            <p className="text-sm text-green-600 mt-1">
              {selProduct?.productName} — {batchQty} KG batch ready for production
              {batchRef && ` (Ref: ${batchRef})`}
            </p>
            <Button
              onClick={() => { setStep('select'); setActiveIdx(null); setBomLines([]) }}
              variant="success"
              className="mt-4">
              Issue Another Batch
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Issue panel ──────────────────────────────────────────────────────────────
function IssuePanel({
  line, remaining, packs, containers, loadingRes,
  scanInput, setScanInput, scanInputRef,
  scanErr, setScanErr,
  foundSource, setFoundSource,
  issueQty, setIssueQty,
  issuing, issueError,
  onScanInput, onOpenScanner, onSubmit,
  // context for purchase indent
  selProduct, batchQty, batchRef, diNo,
}) {
  const totalAvailable   = packs.reduce((s, p) => s + (p.remainingQty || 0), 0)
                         + containers.reduce((s, c) => s + (c.currentQty || 0), 0)
  const noStock          = !loadingRes && packs.length === 0 && containers.length === 0
  const insufficientStock = !loadingRes && !noStock && totalAvailable < remaining

  // Indent state (local — each panel instance is independent)
  const [showIndent,    setShowIndent]    = useState(false)
  const [indentDiNo,    setIndentDiNo]    = useState(diNo || '')
  const [indentBatchNo, setIndentBatchNo] = useState(batchRef || '')
  const [indentPlant,   setIndentPlant]   = useState('')
  const [indentLoading, setIndentLoading] = useState(false)
  const [indentResult,  setIndentResult]  = useState(null)
  const [indentErr,     setIndentErr]     = useState('')

  // Keep local copies in sync if parent values change (e.g. task re-selected)
  useEffect(() => { setIndentDiNo(diNo || '') },    [diNo])
  useEffect(() => { setIndentBatchNo(batchRef || '') }, [batchRef])

  async function handleIndentSubmit() {
    if (!selProduct?.productCode || !indentDiNo.trim() || !indentBatchNo.trim() || !batchQty) {
      setIndentErr('Product, DI No, Batch No and Batch Size are all required')
      return
    }
    setIndentLoading(true); setIndentErr('')
    try {
      const r = await indentApi.create({
        productCode: selProduct.productCode,
        productName: selProduct.productName,
        diNo:        indentDiNo.trim(),
        batchNo:     indentBatchNo.trim(),
        batchSize:   parseFloat(batchQty),
        plant:       indentPlant,
      })
      setIndentResult(r)
      setShowIndent(false)
    } catch (e) {
      setIndentErr(e?.response?.data?.error || e.message)
    } finally {
      setIndentLoading(false)
    }
  }

  return (
    <div className="border-t border-indigo-200 bg-white p-4">
      {loadingRes ? (
        <p className="text-sm text-gray-400 text-center py-4">Checking available stock...</p>
      ) : (
        <div className="space-y-4">

          {/* ── No stock: shortage banner + indent ── */}
          {noStock && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-800">No stock found for {line.rmName}</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    No warehouse packs or containers have stock for this raw material.
                    Raise a purchase indent so the purchasing team can procure it.
                  </p>
                </div>
                {!showIndent && !indentResult && (
                  <button
                    type="button"
                    onClick={() => setShowIndent(true)}
                    className="self-start sm:shrink-0 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                    Raise Purchase Indent
                  </button>
                )}
              </div>

              {/* ── Indent form ── */}
              {showIndent && !indentResult && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">
                    Purchase Indent — {selProduct?.productName || 'Product'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">DI No. *</label>
                      <input value={indentDiNo} onChange={e => setIndentDiNo(e.target.value)}
                        placeholder="e.g. LT-26-018"
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">Batch No. *</label>
                      <input value={indentBatchNo} onChange={e => setIndentBatchNo(e.target.value)}
                        placeholder="e.g. NP-20260701-01"
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">Batch Size (KG)</label>
                      <input value={batchQty} readOnly
                        className="w-full border border-gray-100 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">Plant</label>
                      <select value={indentPlant} onChange={e => setIndentPlant(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-400">
                        <option value="">— Select —</option>
                        {['Nano', 'Botanical', 'Liquid', 'Powder', 'Granules'].map(p => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {indentErr && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 mb-2">{indentErr}</p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowIndent(false); setIndentErr('') }}
                      className="flex-1 text-xs font-semibold border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="button" onClick={handleIndentSubmit} disabled={indentLoading || !indentDiNo.trim() || !indentBatchNo.trim()}
                      className="flex-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                      {indentLoading ? 'Raising...' : 'Submit Indent'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Indent success ── */}
              {indentResult && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-xs font-bold text-green-700 mb-1">Indent raised successfully!</p>
                  {indentResult.stockChecks?.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                      {indentResult.stockChecks.map((c, i) => (
                        <div key={i} className="flex justify-between text-xs text-red-700">
                          <span>{c.rmName}</span>
                          <span className="font-semibold">Short: {Number(c.shortfall).toFixed(3)} kg</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-amber-700">{indentResult.message}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Insufficient stock: shortage warning + indent ── */}
          {insufficientStock && (
            <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-orange-800">Stock insufficient for {line.rmName}</p>
                  <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
                    Only <strong>{totalAvailable.toFixed(3)} {line.uom}</strong> available but{' '}
                    <strong>{remaining} {line.uom}</strong> still needed.
                    You can issue what's available now and raise an indent for the shortfall.
                  </p>
                </div>
                {!showIndent && !indentResult && (
                  <button
                    type="button"
                    onClick={() => setShowIndent(true)}
                    className="self-start sm:shrink-0 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                    Raise Purchase Indent
                  </button>
                )}
              </div>

              {/* Shared indent form (same as noStock case below) */}
              {showIndent && !indentResult && (
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-2">
                    Purchase Indent — {selProduct?.productName || 'Product'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">DI No. *</label>
                      <input value={indentDiNo} onChange={e => setIndentDiNo(e.target.value)}
                        placeholder="e.g. LT-26-018"
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">Batch No. *</label>
                      <input value={indentBatchNo} onChange={e => setIndentBatchNo(e.target.value)}
                        placeholder="e.g. NP-20260701-01"
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">Batch Size (KG)</label>
                      <input value={batchQty} readOnly
                        className="w-full border border-gray-100 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">Plant</label>
                      <select value={indentPlant} onChange={e => setIndentPlant(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-orange-400">
                        <option value="">— Select —</option>
                        {['Nano', 'Botanical', 'Liquid', 'Powder', 'Granules'].map(p => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {indentErr && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 mb-2">{indentErr}</p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowIndent(false); setIndentErr('') }}
                      className="flex-1 text-xs font-semibold border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="button" onClick={handleIndentSubmit} disabled={indentLoading || !indentDiNo.trim() || !indentBatchNo.trim()}
                      className="flex-1 text-xs font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                      {indentLoading ? 'Raising...' : 'Submit Indent'}
                    </button>
                  </div>
                </div>
              )}

              {indentResult && (
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <p className="text-xs font-bold text-green-700 mb-1">Indent raised successfully!</p>
                  {indentResult.stockChecks?.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                      {indentResult.stockChecks.map((c, i) => (
                        <div key={i} className="flex justify-between text-xs text-red-700">
                          <span>{c.rmName}</span>
                          <span className="font-semibold">Short: {Number(c.shortfall).toFixed(3)} kg</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-orange-700">{indentResult.message}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Scan row ── */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Scan Pack or Container QR Code
            </label>
            <div className="flex gap-2">
              <IconButton icon={Camera} onClick={onOpenScanner} tooltip="Open camera scanner" variant="purple" size="md" />
              <input
                ref={scanInputRef}
                value={scanInput}
                onChange={e => { setScanInput(e.target.value); setScanErr(''); setFoundSource(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && scanInput.trim()) onScanInput(scanInput) }}
                placeholder="Scan QR code or type Pack / Container ID..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => scanInput.trim() && onScanInput(scanInput)}
                disabled={!scanInput.trim()}
                className="px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Find
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Works with pack bags and containers — one scanner for both.
              Container QR must start with <span className="font-mono">CONT:</span>
            </p>
          </div>

          {/* ── Scan error ── */}
          {scanErr && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
              {scanErr}
            </div>
          )}

          {/* ── Found source card + issue form ── */}
          {foundSource && (
            <div className={`rounded-xl border overflow-hidden ${
              foundSource.type === 'pack' ? 'border-indigo-200' : 'border-orange-200'
            }`}>
              <div className={`px-4 py-3 text-xs ${
                foundSource.type === 'pack' ? 'bg-indigo-50' : 'bg-orange-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{foundSource.type === 'pack' ? '📦' : '🏺'}</span>
                  <span className={`font-bold text-sm ${foundSource.type === 'pack' ? 'text-indigo-800' : 'text-orange-800'}`}>
                    {foundSource.type === 'pack' ? 'Warehouse Pack Found' : 'Container Found'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-1 text-gray-600">
                  <div>
                    <span className="text-gray-400">ID: </span>
                    <span className="font-mono font-semibold text-gray-900 break-all">{foundSource.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Available: </span>
                    <span className="font-bold text-green-700">{foundSource.availableQty} {foundSource.uom}</span>
                  </div>
                  {foundSource.lotNo && (
                    <div>
                      <span className="text-gray-400">Lot: </span>
                      <span>{foundSource.lotNo} · Bag #{foundSource.bagNo}</span>
                    </div>
                  )}
                  {foundSource.supplier && (
                    <div>
                      <span className="text-gray-400">Supplier: </span>
                      <span>{foundSource.supplier}</span>
                    </div>
                  )}
                  {foundSource.itemName && (
                    <div>
                      <span className="text-gray-400">Item: </span>
                      <span>{foundSource.itemName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Still needed: </span>
                    <span className="font-bold text-red-600">{remaining} {line.uom}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-white">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Qty to Issue ({line.uom})
                    </label>
                    <input type="number" min="0.001" step="0.001"
                      max={Math.min(foundSource.availableQty, remaining)}
                      value={issueQty}
                      onChange={e => setIssueQty(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ${
                        foundSource.type === 'pack'
                          ? 'border-indigo-200 focus:ring-indigo-400'
                          : 'border-orange-200 focus:ring-orange-400'
                      }`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Max: {Math.min(foundSource.availableQty, remaining).toFixed(3)} {line.uom}
                    </p>
                  </div>
                  <button type="button"
                    onClick={onSubmit}
                    disabled={issuing || !issueQty || parseFloat(issueQty) <= 0}
                    className={`shrink-0 mb-5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors disabled:opacity-40 ${
                      foundSource.type === 'pack'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-orange-500 hover:bg-orange-600'
                    }`}>
                    {issuing ? 'Issuing...' : 'Issue'}
                  </button>
                </div>
                {issueError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded border border-red-100 mt-1">
                    {issueError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Prompt when nothing scanned yet ── */}
          {!foundSource && !scanErr && !noStock && (
            <div className="text-center py-4">
              <button type="button" onClick={onOpenScanner}
                className="flex items-center gap-2 mx-auto px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
                Open Camera Scanner
              </button>
              <p className="text-xs text-gray-400 mt-2">or type / scan the ID in the field above</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}