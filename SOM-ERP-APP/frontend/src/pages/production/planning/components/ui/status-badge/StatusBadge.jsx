import { statusBadgeCls } from '../../../data/plantConfig.js'
import './StatusBadge.css'

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${statusBadgeCls(status)}`}>
      {status || '—'}
    </span>
  )
}
