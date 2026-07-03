import prisma from '../../../../../db.js'

export const migrateTables = async (req, res) => {
  return res.json({ success: true, message: 'Microbial SFG tables managed by Prisma — no migration needed' })
}

export const createMicrobe = async (req, res) => {
  try {
    const { microbe_name, microbe_code } = req.body || {}
    if (!microbe_name || !microbe_code)
      return res.status(400).json({ success: false, error: 'microbe_name and microbe_code are required', code: 'VALIDATION_ERROR' })

    const row = await prisma.microbeMaster.create({
      data: {
        microbeName: microbe_name.trim(),
        microbeCode: microbe_code.trim().toUpperCase(),
      },
    })
    return res.status(201).json({ success: true, data: row })
  } catch (e) {
    if (e.code === 'P2002')
      return res.status(409).json({ success: false, error: 'Microbe code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}

export const importMicrobes = async (req, res) => {
  try {
    const { rows } = req.body || {}
    if (!Array.isArray(rows) || !rows.length)
      return res.status(400).json({ success: false, error: 'rows array required', code: 'VALIDATION_ERROR' })

    let imported = 0, skipped = 0
    const errors = []

    for (const r of rows) {
      const keys = Object.keys(r)
      const nameKey = keys.find(k => /microbe.?name|^name$/i.test(k))
      const codeKey = keys.find(k => /microbe.?code|^code$/i.test(k))
      const name = (r.microbe_name || r['Microbe Name'] || r['MICROBE NAME'] || (nameKey ? r[nameKey] : '') || '').toString().trim()
      const code = (r.microbe_code || r['Microbe Code'] || r['MICROBE CODE'] || (codeKey ? r[codeKey] : '') || '').toString().trim().toUpperCase()

      if (!name || !code) {
        skipped++
        errors.push({ row: JSON.stringify(r).slice(0, 80), error: 'Could not find Microbe Name or Microbe Code columns' })
        continue
      }

      try {
        await prisma.microbeMaster.upsert({
          where: { microbeCode: code },
          create: { microbeName: name, microbeCode: code },
          update: { microbeName: name },
        })
        imported++
      } catch (e) {
        errors.push({ row: code, error: e.message })
        skipped++
      }
    }

    return res.json({ success: true, imported, skipped, errors })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
