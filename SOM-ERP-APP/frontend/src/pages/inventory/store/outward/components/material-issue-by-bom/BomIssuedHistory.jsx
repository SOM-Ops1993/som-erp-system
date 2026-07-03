import { useState, useEffect, useMemo, Fragment } from 'react'
import { outwardApi } from '../../../../../../api/inventory.js'
import { Button } from '../../../../../../components/ui'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { readSessions, deleteSession } from './bomSessions.js'

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Outward remarks for BOM issuance are written as:
// "BOM: {productName} | Batch: {batchSize} kg | Ref: {batchRef}"
function parseRemarks(remarks) {
  const m = /^BOM:\s*(.*?)(?:\s*\|\s*Batch:\s*([\d.]+)\s*kg)?(?:\s*\|\s*Ref:\s*(.*))?$/.exec(remarks || '')
  return {
    productName: m?.[1]?.trim() || 'Unknown product',
    batchSize:   m?.[2] || '',
    batchRef:    m?.[3]?.trim() || '',
  }
}

const STATUS_STYLE = {
  Pending:            'bg-gray-100 text-gray-600',
  'Partially Issued':  'bg-amber-100 text-amber-700',
  'Fully Issued':      'bg-green-100 text-green-700',
}

export default function BomIssuedHistory({ onResume }) {
  const [sessions, setSessions] = useState(() => readSessions())
  const [histRows, setHistRows] = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setLoading(true)
    outwardApi.history({ limit: 300 })
      .then(r => setHistRows((r.data || []).filter(row => row.sourceType === 'BOM_ISSUANCE')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const removeSession = (id) => { deleteSession(id); setSessions(readSessions()) }

  // Group individual issuance lines back into their BOM batch
  const historyBatches = useMemo(() => {
    const map = new Map()
    for (const row of histRows) {
      const { productName, batchSize, batchRef } = parseRemarks(row.remarks)
      const key = `${productName}__${batchRef}`
      if (!map.has(key)) map.set(key, { key, productName, batchSize, batchRef, lines: [], lastTs: row.timestamp })
      const b = map.get(key)
      b.lines.push(row)
      if (new Date(row.timestamp) > new Date(b.lastTs)) b.lastTs = row.timestamp
    }
    return [...map.values()]
  }, [histRows])

  // Merge in-progress sessions with issued history into one unified table.
  // A session already in progress "owns" its batch; only add the backend
  // batch separately once that session has completed and disappeared.
  const rows = useMemo(() => {
    const sessionKeys = new Set(sessions.map(s => `${s.productName}__${s.batchRef || ''}`))

    const sessionRows = sessions.map(s => {
      const total     = s.bomLines?.length || 0
      const done      = s.bomLines?.filter(l => l.issued >= l.required - 0.001).length || 0
      const anyIssued = s.bomLines?.some(l => (l.issued || 0) > 0.001)
      const status    = total > 0 && done === total ? 'Fully Issued' : anyIssued ? 'Partially Issued' : 'Pending'
      return {
        key: `session-${s.id}`, isSession: true, session: s,
        productName: s.productName, productCode: s.productCode,
        batchQty: s.batchQty, batchRef: s.batchRef,
        status, materials: `${done}/${total} materials`,
        lastUpdated: s.updatedAt,
        lines: (s.bomLines || []).map(l => ({
          rmName: l.rmName, rmCode: l.rmCode,
          detail: `${l.issued} / ${l.required} ${l.uom}`,
        })),
      }
    })

    const historyRows = historyBatches
      .filter(b => !sessionKeys.has(`${b.productName}__${b.batchRef || ''}`))
      .map(b => ({
        key: `hist-${b.key}`, isSession: false,
        productName: b.productName, productCode: '',
        batchQty: b.batchSize, batchRef: b.batchRef,
        status: 'Fully Issued', materials: `${b.lines.length} item${b.lines.length !== 1 ? 's' : ''} issued`,
        lastUpdated: b.lastTs,
        lines: b.lines.map(l => ({
          rmName: l.rmName || l.rmCode, rmCode: l.sourceId,
          detail: `${Number(l.qtyIssued).toFixed(3)} kg · ${fmtDate(l.timestamp)}`,
        })),
      }))

    return [...sessionRows, ...historyRows].sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
  }, [sessions, historyBatches])

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">BOM Issued</h2>
        <p className="text-sm text-gray-500 mt-0.5">In-progress issuance sessions and completed BOM issuance history</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center text-sm text-gray-400">
          No BOM sessions or issuances recorded yet
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white text-xs">
              <tr>
                <th className="px-4 py-2.5 w-8" />
                <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold">Product</th>
                <th className="text-left px-4 py-2.5 font-semibold">Batch Ref</th>
                <th className="text-left px-4 py-2.5 font-semibold">Materials</th>
                <th className="text-left px-4 py-2.5 font-semibold">Last Updated</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isOpen = expanded === row.key
                return (
                  <Fragment key={row.key}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(isOpen ? null : row.key)}>
                      <td className="px-4 py-2.5 text-gray-400">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[row.status]}`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-900">{row.productName}</div>
                        {row.productCode && <div className="text-xs text-gray-400 font-mono">{row.productCode}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-700">{row.batchQty} KG</span>
                        {row.batchRef && <div className="text-xs text-gray-400 font-mono">{row.batchRef}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{row.materials}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {row.lastUpdated ? fmtDate(row.lastUpdated) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {row.isSession && (
                          <>
                            <Button onClick={() => onResume(row.session)} variant="purple" size="xs" className="mr-1.5">
                              Resume →
                            </Button>
                            <Button onClick={() => removeSession(row.session.id)} variant="danger" size="xs">
                              Delete
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="text-gray-400">
                              <tr>
                                <th className="text-left font-medium pb-1">RM</th>
                                <th className="text-left font-medium pb-1">Code / Source</th>
                                <th className="text-left font-medium pb-1">Detail</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.lines.map((l, i) => (
                                <tr key={i} className="border-t border-gray-200">
                                  <td className="py-1 text-gray-700">{l.rmName}</td>
                                  <td className="py-1 font-mono text-gray-400">{l.rmCode}</td>
                                  <td className="py-1 text-gray-600">{l.detail}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
