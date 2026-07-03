import { useState } from 'react'
import PackInward from '../components/pack-inward/PackInward.jsx'
import BulkInward from '../components/bulk-inward/BulkInward.jsx'
import InwardHistory from '../components/inward-history/InwardHistory.jsx'
import { BackButton } from '../../../../../components/ui'
import './Inward.css'

// const TABS = ['📦 Pack Inward', '🗄️ Bulk Inward', '📋 Inward History']
const TABS = ['📦 Pack Inward',  '📋 Inward History']

export default function Inward() {
  const [tab, setTab] = useState(0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-0 md:px-6 md:pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Inward — Receive Stock</h1>
            {/* Full explainer only earns its space on desktop — on mobile it just
                pushes the actual tools (tabs, scanner) further down the screen. */}
            <p className="hidden md:block text-sm text-gray-500 mt-1">
              Pack Inward: scan individual QR-labelled bags · Bulk Inward: receive lots of bulk consumables by location · History: view all inwarded stock
            </p>
          </div>
          {/* Mobile has the device's native back gesture/button already */}
          <div className="hidden md:block">
            <BackButton />
          </div>
        </div>
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-3 md:px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 0 ? <PackInward /> : tab === 1 ?  <InwardHistory /> : <InwardHistory />}
        {/* {tab === 0 ? <PackInward /> : tab === 1 ? <BulkInward /> : <InwardHistory />} */}
      </div>
    </div>
  )
}
