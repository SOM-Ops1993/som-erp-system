import { PLANT_BADGE } from '../../../data/plantConfig.js'
import './PlantBadge.css'

export default function PlantBadge({ plant }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${PLANT_BADGE[plant] || 'bg-gray-100 text-gray-600'}`}>
      {plant}
    </span>
  )
}
