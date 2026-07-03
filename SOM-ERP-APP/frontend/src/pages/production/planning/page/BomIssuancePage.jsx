import { useEffect, useRef, useState } from 'react'
import { planTasksApi } from '../../../../api/production.js'
import { CheckCircle, AlertCircle, Loader, X } from 'lucide-react'
import bomHtml from '../bom-issuance/bom-issuance.html?raw'

// Maps the HTML form's "Section" dropdown value to a backend plant name
const SECTION_TO_PLANT = {
  Nano:   'Nano',
  Powder: 'Powder',
}
const DEFAULT_PLANT = 'Powder'

export default function BomIssuancePage() {
  const iframeRef = useRef(null)
  const [banner, setBanner]   = useState(null)  // null | { type:'loading'|'success'|'error', msg }
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const handler = async (event) => {
      if (event.data?.type !== 'SOM_BOM_CONFIRMED') return
      const boms = event.data.boms || []
      if (!boms.length) return

      setPending(true)
      setBanner({ type: 'loading', msg: `Creating ${boms.length} production task(s)…` })

      try {
        let created = 0
        for (const bom of boms) {
          const plant = SECTION_TO_PLANT[bom.section] || DEFAULT_PLANT
          const date  = bom.datePlanned || new Date().toISOString().slice(0, 10)
          await planTasksApi.create({
            plant,
            date,
            productName: bom.productName,
            batchCode:   bom.batchNo        || null,
            qty:         parseFloat(bom.batchSize) || 0,
            qtyUom:      bom.batchSizeUom   || 'KG',
            diNo:        bom.diNumber       || null,
            shift:       bom.shift          || 'General',
            incharge:    bom.batchIncharge  || '',
            equipment:   bom.reactor        || null,
            process:     'Formulation',
            remarks:     [bom.bomNo, bom.remarks].filter(Boolean).join(' · ') || null,
            sent:        true,
          })
          created++
        }
        setBanner({
          type: 'success',
          msg:  `✓ ${created} production task(s) created — visible in Store Outward → Material Issue by BOM`,
        })
      } catch (e) {
        setBanner({ type: 'error', msg: `Failed to create tasks: ${e.message}` })
      } finally {
        setPending(false)
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const bannerCls = {
    loading: 'bg-blue-50  border-blue-200  text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50   border-red-200   text-red-700',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Instruction strip */}
      <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-[12.5px] text-amber-800 flex-shrink-0">
        <span className="font-semibold">📋 BOM Issuance</span>
        <span className="text-amber-600 hidden sm:inline">
          — Fill the form and click <b>✅ Confirm Issue</b> to push tasks to <b>Store Outward → Material Issue by BOM</b>.
        </span>
      </div>

      {/* Status banner after confirm */}
      {banner && (
        <div className={`px-5 py-2 border-b flex items-center gap-2 text-[13px] font-medium flex-shrink-0 ${bannerCls[banner.type]}`}>
          {banner.type === 'loading' && <Loader size={14} className="animate-spin flex-shrink-0" />}
          {banner.type === 'success' && <CheckCircle size={14} className="flex-shrink-0" />}
          {banner.type === 'error'   && <AlertCircle size={14} className="flex-shrink-0" />}
          <span>{banner.msg}</span>
          {!pending && (
            <button onClick={() => setBanner(null)} className="ml-auto opacity-60 hover:opacity-100 flex-shrink-0">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* The BOM form — rendered from the bundled HTML source, no public/ dependency */}
      <iframe
        ref={iframeRef}
        srcdoc={bomHtml}
        className="flex-1 w-full border-0"
        title="BOM Issuance System"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
