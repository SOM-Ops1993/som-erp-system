// seed-cp-profiles.js
// Seeds CustomerProductProfile table from the Excel export (ERP Autofill Lookup sheet)
// Run: node seed-cp-profiles.js

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

async function main() {
  const raw = JSON.parse(
    readFileSync(join(__dirname, 'cp-profiles-excel.json'), 'utf8')
  )

  console.log(`\n📋 Seeding ${raw.length} customer-product profiles…\n`)

  let created = 0, updated = 0, errors = 0

  for (const p of raw) {
    try {
      const name = (p.customerName || '').trim().toUpperCase()
      const pname = (p.productName  || '').trim()
      if (!name || !pname) continue

      const existing = await prisma.customerProductProfile.findUnique({
        where: { customerName_productName: { customerName: name, productName: pname } }
      })

      if (existing) {
        // Only update if Excel has more data than what's stored
        const update = {}
        if (!existing.unitQty       && p.unitQty)       update.unitQty       = p.unitQty
        if (!existing.unitUom       && p.unitUom)       update.unitUom       = p.unitUom
        if (!existing.unitsPerCS    && p.unitsPerCS)    update.unitsPerCS    = p.unitsPerCS
        if (!existing.primaryPack   && p.primaryPack)   update.primaryPack   = p.primaryPack
        if (!existing.secondaryPack && p.secondaryPack) update.secondaryPack = p.secondaryPack
        if (!existing.labelType     && p.labelType)     update.labelType     = p.labelType
        if (!existing.activeSpecs   && p.activeSpecs)   update.activeSpecs   = p.activeSpecs
        if (Object.keys(update).length > 0) {
          await prisma.customerProductProfile.update({
            where: { customerName_productName: { customerName: name, productName: pname } },
            data: update,
          })
          updated++
        }
      } else {
        await prisma.customerProductProfile.create({
          data: {
            customerName:  name,
            productName:   pname,
            productCode:   p.productCode   || null,
            unitQty:       p.unitQty       || null,
            unitUom:       p.unitUom       || null,
            unitsPerCS:    p.unitsPerCS    || null,
            primaryPack:   p.primaryPack   || null,
            secondaryPack: p.secondaryPack || null,
            labelType:     p.labelType     || null,
            activeSpecs:   p.activeSpecs   || null,
            orderCount:    1,
          }
        })
        created++
      }
    } catch (e) {
      console.error(`  ❌ ${p.customerName} / ${p.productName}: ${e.message}`)
      errors++
    }
  }

  console.log(`\n✅ Done!`)
  console.log(`   Created : ${created}`)
  console.log(`   Updated : ${updated}`)
  console.log(`   Errors  : ${errors}`)
  console.log(`   Total   : ${raw.length}\n`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
