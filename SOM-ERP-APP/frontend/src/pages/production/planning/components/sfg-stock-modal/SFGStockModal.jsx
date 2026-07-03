import { sfgLoad } from '../../utils/storage.js'
import { IconButton } from '../../../../../components/ui'
import { X } from 'lucide-react'
import './SFGStockModal.css'


export default function SFGStockModal({ onClose }) {
  const list = sfgLoad().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))

  const statusCls = s =>
    s === 'Available'     ? 'bg-green-100 text-green-700 border border-green-200' :
    s === 'Partially Used'? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-gray-100 text-gray-500 border border-gray-200'

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-5 bg-black/50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="ssm-header flex items-center justify-between px-6 py-4 text-white flex-shrink-0">
          <div>
            <div className="text-base font-bold">📦 SFG Stock — Semi-Finished Goods</div>
            <div className="text-[12px] opacity-80 mt-0.5">Formulated batches awaiting packing</div>
          </div>
          <IconButton icon={X} tooltip="Close" onClick={onClose} className="ssm-icon-btn text-white" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {list.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-3xl mb-2">📦</div>
              <div className="font-medium text-gray-500">No SFG stock recorded yet</div>
              <div className="text-[12px] mt-1">
                Created automatically when a Formulation BMR is signed off with "Packing Also = No"
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {['Product','Batch No','Plant','Qty Remaining','Location','Status','Created'].map(h => (
                      <th key={h} className="px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{s.productName}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-gray-600">{s.batchCode||'—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{s.plant}</td>
                      <td className={`px-3 py-2.5 font-bold ${s.qtyRemaining > 0 ? 'ssm-qty--positive' : 'ssm-qty--zero'}`}>
                        {s.qtyRemaining} <span className="text-[11px] text-gray-400 font-normal">{s.qtyUom}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{s.location||'—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCls(s.status)}`}>{s.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-400">
                        {new Date(s.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
