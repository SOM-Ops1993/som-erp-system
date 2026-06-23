// auto-seed.js
// Seeds reference tables on first startup if they are empty.
// Safe to run repeatedly — checks count before doing anything.
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

const COMPANIES = [
  { code: 'SOM',    name: 'SOM Phytopharma Pvt Ltd' },
  { code: 'AL-IPL', name: 'Agrilife India Pvt Ltd' },
  { code: 'AL-LLC', name: 'Agrilife LLC' },
  { code: 'AL-PTE', name: 'Agrilife PTE Ltd' },
  { code: 'DVS',    name: 'DVS Agri Pvt Ltd' },
]

export async function runAutoSeed(log) {
  try {
    // ── 1. Seed CompanyMaster ────────────────────────────────────────────────
    const coCount = await prisma.companyMaster.count()
    if (coCount === 0) {
      for (const c of COMPANIES) {
        await prisma.companyMaster.upsert({
          where: { code: c.code },
          update: {},
          create: { code: c.code, name: c.name },
        })
      }
      log(`Auto-seed: loaded ${COMPANIES.length} companies`)
    }

    // ── 2. Seed CustomerProfile ──────────────────────────────────────────────
    const cpCount = await prisma.customerProfile.count()
    if (cpCount === 0) {
      const seedFile = join(__dirname, '..', 'seeds', 'customer-profiles.json')
      let profiles = []
      try { profiles = JSON.parse(readFileSync(seedFile, 'utf8')) } catch { /* no file */ }
      if (profiles.length > 0) {
        let n = 0
        for (const p of profiles) {
          await prisma.customerProfile.upsert({
            where: { customerName: p.customerName },
            update: {},
            create: {
              customerName: p.customerName,
              company:      p.company    || '',
              orderType:    p.orderType  || 'DOMESTIC',
              orderCount:   p.orderCount || 1,
            },
          })
          n++
        }
        log(`Auto-seed: loaded ${n} customer profiles`)
      }
    }

    // ── 3. Seed CustomerProductProfile ──────────────────────────────────────
    const cppCount = await prisma.customerProductProfile.count()
    if (cppCount === 0) {
      const seedFile = join(__dirname, '..', 'seeds', 'cp-profiles-excel.json')
      let profiles = []
      try { profiles = JSON.parse(readFileSync(seedFile, 'utf8')) } catch { /* no file */ }
      if (profiles.length > 0) {
        let n = 0
        for (const p of profiles) {
          const name  = (p.customerName || '').trim().toUpperCase()
          const pname = (p.productName  || '').trim()
          if (!name || !pname) continue
          try {
            await prisma.customerProductProfile.upsert({
              where: { customerName_productName: { customerName: name, productName: pname } },
              update: {},
              create: {
                customerName:  name,
                productName:   pname,
                unitQty:       p.unitQty       || null,
                unitUom:       p.unitUom        || null,
                unitsPerCS:    p.unitsPerCS     || null,
                primaryPack:   p.primaryPack    || null,
                secondaryPack: p.secondaryPack  || null,
                labelType:     p.labelType      || null,
                activeSpecs:   p.activeSpecs    || null,
                orderCount:    1,
              },
            })
            n++
          } catch { /* skip duplicates */ }
        }
        log(`Auto-seed: loaded ${n} customer-product profiles`)
      }
    }

  } catch (err) {
    // Non-fatal — log but don't crash startup
    console.error('Auto-seed warning:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}
