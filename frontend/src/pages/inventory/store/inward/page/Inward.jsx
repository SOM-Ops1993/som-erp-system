import { useState } from 'react'
import PackInward from '../components/PackInward.jsx'
import BulkInward from '../components/BulkInward.jsx'
import InwardHistory from '../components/InwardHistory.jsx'
import BackButton from '../../../../../components/erp/BackButton.jsx'

const TABS = ['📦 Pack Inward', '🗄️ Bulk Inward', '📋 Inward History']

export default function Inward() {
  const [tab, setTab] = useState(0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inward — Receive Stock</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pack Inward: scan individual QR-labelled bags · Bulk Inward: receive lots of bulk consumables by location · History: view all inwarded stock
            </p>
          </div>
          <BackButton />
        </div>
        <div className="flex gap-0 border-b border-gray-200">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 0 ? <PackInward /> : tab === 1 ? <BulkInward /> : <InwardHistory />}
      </div>
    </div>
  )
}
