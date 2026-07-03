import { PLANT_CONFIG } from '../data/plantConfig.js'
import { SK, lsLoad, lsSave, genId } from './storage.js'

function genProductCode(productName, existingCodes) {
  const skip = new Set(['of','and','the','in','with','for','a','an','by'])
  const words = productName.trim().split(/\s+/).filter(w => !skip.has(w.toLowerCase()))
  let code = words.slice(0,3).map(w => w[0].toUpperCase()).join('')
  if (code.length < 2) code = productName.slice(0,3).toUpperCase()
  let attempt = code, n = 2
  while (existingCodes.has(attempt) && n < 100) { attempt = code + n; n++ }
  return attempt
}

export function getNextBatchCode(plant, productName, carrier, specs, today) {
  const registry          = lsLoad(SK.batchReg)
  const tasks             = lsLoad(SK.tasks)
  const needsCarrierSpecs = ['Powder','Granules'].includes(plant)
  const yymmdd            = today.slice(2).replace(/-/g,'')

  const existingCodes = new Set(registry.map(r => r.productCode))
  let prodEntry = registry.find(r => r.productName.toLowerCase() === productName.toLowerCase())
  if (!prodEntry) {
    const newCode = genProductCode(productName, existingCodes)
    prodEntry = { productName, productCode: newCode }
    registry.push(prodEntry)
    lsSave(SK.batchReg, registry)
  }
  const pCode = prodEntry.productCode

  if (!needsCarrierSpecs) {
    const prevActive = tasks.filter(t =>
      t.plant === plant && t.productName === productName &&
      t.status !== 'Completed' && t.status !== 'Cancelled'
    )
    if (prevActive.length > 0) return { code: prevActive[prevActive.length-1].batchCode, carried: true }
    const allPrev = tasks.filter(t => t.plant === plant && t.productName === productName)
    const seq = String(allPrev.length + 1).padStart(2,'0')
    return { code: pCode + yymmdd + seq, carried: false }
  }

  const cCode = (carrier||'X').replace(/[^A-Za-z0-9]/g,'').slice(0,4).toUpperCase()
  let sCode = 'S'
  if (specs) { const m = specs.toUpperCase().match(/E[+]?(\d+)/); if (m) sCode = m[0].replace('+','').slice(0,3) }
  const key = productName + '|' + carrier + '|' + specs
  const prevActive = tasks.filter(t => t.plant === plant && t.batchKey === key && t.status !== 'Completed' && t.status !== 'Cancelled')
  if (prevActive.length > 0) return { code: prevActive[prevActive.length-1].batchCode, carried: true }
  const allPrev = tasks.filter(t => t.plant === plant && t.batchKey === key)
  const seq = String(allPrev.length + 1).padStart(2,'0')
  return { code: `${pCode}-${cCode}-${sCode}-${yymmdd}-${seq}`, carried: false }
}

export function generateTaskId(plant, date) {
  const prefix = PLANT_CONFIG[plant]?.prefix || 'XX'
  const d      = date.replace(/-/g, '')
  // Use timestamp+random to avoid collisions (tasks are now in the backend, not localStorage)
  const rand   = Date.now().toString(36).slice(-3).toUpperCase() +
                 Math.random().toString(36).slice(2, 4).toUpperCase()
  return `${prefix}-${d}-${rand}`
}
