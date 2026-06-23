import prisma from '../../../../db.js'

export const syncFromExcelHandler = async (req, reply) => {
  try {
    const result = await syncFromExcel()
    return { success: true, ...result }
  } catch (e) {
    return reply.status(500).send({ success: false, error: e.message })
  }
}

async function syncFromExcel() {
  const MS365_ENABLED = process.env.MS365_ENABLED === 'true'
  if (!MS365_ENABLED)
    return { message: 'MS365 sync disabled. Set MS365_ENABLED=true to enable.', synced: 0 }

  const tenantId = process.env.MS365_TENANT_ID
  const clientId = process.env.MS365_CLIENT_ID
  const clientSecret = process.env.MS365_CLIENT_SECRET
  const fileId = process.env.MS365_FILE_ID
  const sheetName = process.env.MS365_SHEET_NAME || 'Sales_Orders'

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    },
  )
  const { access_token } = await tokenRes.json()

  const sheetRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets/${sheetName}/usedRange`,
    { headers: { Authorization: `Bearer ${access_token}` } },
  )
  const sheetData = await sheetRes.json()
  const rows = sheetData.values || []
  if (rows.length < 2) return { synced: 0, message: 'No data rows found' }

  const headers = rows[0].map(h => h?.toString().trim().toLowerCase().replace(/\s+/g, '_'))
  const col = name => headers.indexOf(name)
  let synced = 0, created = 0, updated = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const di_number = row[col('di_number')]?.toString().trim()
    if (!di_number) continue

    const rowData = {
      di_number,
      company: row[col('company')] || null,
      order_type: row[col('order_type')] || 'Domestic',
      customer_name: row[col('customer_name')] || null,
      order_date: row[col('order_date')] || null,
      etd: row[col('etd')] || null,
      product_code: row[col('product_code')] || null,
      order_qty: parseFloat(row[col('order_qty')]) || null,
      qty_unit: row[col('qty_unit')] || 'kg',
      active_ingredient: row[col('active_ingredient')] || null,
      specifications: row[col('specifications')] || null,
      carrier: row[col('carrier')] || null,
      per_unit_qty_pp: parseFloat(row[col('per_unit_qty_pp')]) || null,
      primary_pack_type: row[col('primary_pack_type')] || null,
      secondary_pack_type: row[col('secondary_pack_type')] || null,
      label_type: row[col('label_type')] || null,
      priority: row[col('priority')] || 'Normal',
      sales_staff: row[col('sales_staff')] || null,
      notes: row[col('notes')] || null,
    }

    const existing = await prisma.erpSalesOrder.findUnique({
      where: { diNumber: di_number },
      select: { diNumber: true, etd: true, orderQty: true, status: true },
    })

    if (!existing) {
      const prod = await prisma.erpProduct.findUnique({
        where: { productCode: rowData.product_code },
        select: { productName: true },
      })
      if (!prod) continue

      await prisma.erpSalesOrder.create({
        data: {
          diNumber: rowData.di_number,
          company: rowData.company,
          orderType: rowData.order_type,
          status: 'new',
          customerName: rowData.customer_name,
          orderDate: rowData.order_date ? new Date(rowData.order_date) : null,
          etd: rowData.etd ? new Date(rowData.etd) : null,
          productCode: rowData.product_code,
          productName: prod.productName,
          orderQty: rowData.order_qty,
          qtyUnit: rowData.qty_unit,
          activeIngredient: rowData.active_ingredient,
          specifications: rowData.specifications,
          carrier: rowData.carrier,
          perUnitQtyPp: rowData.per_unit_qty_pp,
          primaryPackType: rowData.primary_pack_type,
          secondaryPackType: rowData.secondary_pack_type,
          labelType: rowData.label_type,
          priority: rowData.priority,
          salesStaff: rowData.sales_staff,
          notes: rowData.notes,
          excelSyncedAt: new Date(),
        },
      })
      created++
    } else if (existing.status !== 'cancelled') {
      const etdChanged =
        rowData.etd &&
        existing.etd?.toISOString().slice(0, 10) !== new Date(rowData.etd).toISOString().slice(0, 10)
      const qtyChanged =
        rowData.order_qty &&
        Math.abs(Number(existing.orderQty) - rowData.order_qty) > 0.001

      if (etdChanged || qtyChanged) {
        const updateData = {
          etd: rowData.etd ? new Date(rowData.etd) : undefined,
          orderQty: rowData.order_qty || undefined,
          excelSyncedAt: new Date(),
        }
        if (['confirmed', 'planned'].includes(existing.status)) {
          updateData.status = 'at_risk'
        }
        await prisma.erpSalesOrder.update({ where: { diNumber: di_number }, data: updateData })
        updated++
      }
    }
    synced++
  }

  return { synced, created, updated, message: `Sync complete: ${created} created, ${updated} updated` }
}
