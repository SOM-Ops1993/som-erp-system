// Run once: node src/seeds/seed-customers.js
// Seeds 489 customer profiles from Excel historical data into the database
import 'dotenv/config'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import prisma from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const profiles = JSON.parse(readFileSync(path.join(__dirname, 'customer-profiles.json'), 'utf8'))

let created = 0, updated = 0, skipped = 0

for (const p of profiles) {
  try {
    const existing = await prisma.customerProfile.findUnique({
      where: { customerName: p.customerName }
    })
    if (existing) {
      if (p.orderCount > existing.orderCount) {
        await prisma.customerProfile.update({
          where: { customerName: p.customerName },
          data: { company: p.company, orderType: p.orderType, orderCount: p.orderCount }
        })
        updated++
      } else {
        skipped++
      }
    } else {
      await prisma.customerProfile.create({
        data: { customerName: p.customerName, company: p.company, orderType: p.orderType, orderCount: p.orderCount }
      })
      created++
    }
  } catch (e) {
    console.error(`Failed for ${p.customerName}:`, e.message)
  }
}

console.log(`Done — Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)
await prisma.$disconnect()
