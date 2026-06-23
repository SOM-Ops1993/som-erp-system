/**
 * SOM ERP – Google Sheet Sync Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Paste this entire file into your Google Sheet's Apps Script editor
 * (Extensions → Apps Script), then follow the setup steps in the README.
 *
 * What it does:
 *   • Watches for new/edited rows in the "Sales Orders" sheet
 *   • Sends un-synced rows to the SOM ERP backend automatically
 *   • Writes back "✓ Imported" or "✗ Error: …" into the Sync Status column
 *
 * Setup:
 *   1. Open Google Sheets → Extensions → Apps Script
 *   2. Paste this file (replace all existing content)
 *   3. Set WEBHOOK_URL and WEBHOOK_SECRET below
 *   4. Click Save, then run setupTriggers() once from the Run menu
 *   5. Grant the permissions it asks for
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── CONFIG — edit these two values ───────────────────────────────────────────
const WEBHOOK_URL    = 'https://som-erp-backend.onrender.com/api/erp/sales-orders/sheet-import'
const WEBHOOK_SECRET = 'som-sheet-sync-2024'   // must match SHEET_WEBHOOK_SECRET in backend .env
const SHEET_NAME     = 'Sales Orders'           // name of the tab in your Google Sheet
// ─────────────────────────────────────────────────────────────────────────────


// ── Column header names (must match exactly what's in row 1 of your sheet) ───
const COL_MAP = {
  diNo:                'DI No',
  company:             'Company',
  customerName:        'Customer Name',
  orderType:           'Order Type',
  orderDate:           'Order Date',
  etd:                 'ETD',
  priority:            'Priority',
  customerProductName: 'Customer Product Name',
  inhouseProductName:  'Inhouse Product Name',
  inhouseProductCode:  'Inhouse Product Code',
  activeSpecs:         'Active Specs',
  activeIngredient:    'Active Ingredient',
  carrier:             'Carrier',
  sectionName:         'Section',
  totalQty:            'Total Qty',
  totalUom:            'UOM',
  unitQty:             'Unit Qty',
  unitUom:             'Unit UOM',
  unitPackType:        'Unit Pack Type',
  packingType:         'Packing Type',
  totalCS:             'Total CS',
  labelType:           'Label Type',
  mrp:                 'MRP',
  salesStaff:          'Sales Staff',
  remarks:             'Remarks',
  syncStatus:          'Sync Status',   // auto-written by script
  importedAt:          'Imported At',   // auto-written by script
}


// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Run this once from the Apps Script editor to create the triggers
// ─────────────────────────────────────────────────────────────────────────────
function setupTriggers() {
  // Remove any existing triggers first to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers()
  triggers.forEach(t => ScriptApp.deleteTrigger(t))

  // onChange: fires when the sheet content changes (add/edit rows)
  ScriptApp.newTrigger('onSheetChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create()

  // Time-driven safety net: every 2 hours, catches anything the onChange missed
  ScriptApp.newTrigger('scheduledSync')
    .timeBased()
    .everyHours(2)
    .create()

  Logger.log('✅ Triggers set up: onChange + every 2 hours scheduled sync')
  SpreadsheetApp.getUi().alert('Triggers created! The sheet will now auto-sync to SOM ERP.')
}


// ─────────────────────────────────────────────────────────────────────────────
// Called automatically on any sheet change
// ─────────────────────────────────────────────────────────────────────────────
function onSheetChange(e) {
  try {
    syncPendingRows('WEBHOOK')
  } catch (err) {
    Logger.log('onSheetChange error: ' + err.message)
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Called by the time-driven trigger
// ─────────────────────────────────────────────────────────────────────────────
function scheduledSync() {
  try {
    syncPendingRows('SCHEDULED')
  } catch (err) {
    Logger.log('scheduledSync error: ' + err.message)
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Manual sync — run from the custom menu "SOM ERP → Sync Now"
// ─────────────────────────────────────────────────────────────────────────────
function manualSync() {
  const result = syncPendingRows('MANUAL')
  const msg = result
    ? `Done! ${result.imported} imported, ${result.skipped} skipped.`
    : 'No new rows to sync.'
  SpreadsheetApp.getUi().alert('Sync Complete', msg, SpreadsheetApp.getUi().ButtonSet.OK)
}


// ─────────────────────────────────────────────────────────────────────────────
// Core sync logic: finds all rows with DI No but no Sync Status, sends them
// ─────────────────────────────────────────────────────────────────────────────
function syncPendingRows(trigger) {
  const ss    = SpreadsheetApp.getActive()
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    Logger.log('Sheet "' + SHEET_NAME + '" not found. Create it first.')
    return null
  }

  const data    = sheet.getDataRange().getValues()
  if (data.length < 2) return null  // only header row, nothing to sync

  const headers = data[0]

  // Build column index lookup
  const idx = {}
  Object.entries(COL_MAP).forEach(([key, header]) => {
    const i = headers.indexOf(header)
    if (i >= 0) idx[key] = i
  })

  // Validate required columns exist
  const required = ['diNo', 'company', 'customerName', 'etd', 'customerProductName', 'inhouseProductName', 'totalQty']
  const missing  = required.filter(k => idx[k] === undefined)
  if (missing.length > 0) {
    Logger.log('Missing required columns: ' + missing.map(k => COL_MAP[k]).join(', '))
    return null
  }

  // Collect rows that need syncing
  const pendingRows = []
  const pendingNums = []   // 1-based sheet row numbers

  for (let r = 1; r < data.length; r++) {
    const row = data[r]

    // Skip if DI No is empty
    if (!row[idx.diNo] || String(row[idx.diNo]).trim() === '') continue

    // Skip if already synced (Sync Status column is filled)
    if (idx.syncStatus !== undefined && row[idx.syncStatus] && String(row[idx.syncStatus]).trim() !== '') continue

    // Skip if minimum required fields are missing
    if (!row[idx.customerProductName] || !row[idx.inhouseProductName] || !row[idx.totalQty]) continue

    pendingRows.push(buildRowPayload(row, idx))
    pendingNums.push(r + 1)  // +1 because sheet rows are 1-based
  }

  if (pendingRows.length === 0) return null

  // Send to ERP backend
  let result = null
  try {
    const payload = JSON.stringify({ secret: WEBHOOK_SECRET, trigger, rows: pendingRows })
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true,
    }
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    result = JSON.parse(response.getContentText())
    Logger.log('ERP response: ' + JSON.stringify(result))
  } catch (err) {
    Logger.log('HTTP error: ' + err.message)
    // Mark rows as error
    pendingNums.forEach(rn => {
      if (idx.syncStatus !== undefined) sheet.getRange(rn, idx.syncStatus + 1).setValue('✗ Network error')
      if (idx.importedAt !== undefined) sheet.getRange(rn, idx.importedAt + 1).setValue(new Date().toLocaleString())
    })
    return null
  }

  // Write back sync status to each row
  const syncCol    = idx.syncStatus !== undefined ? idx.syncStatus + 1 : null
  const importedCol= idx.importedAt !== undefined ? idx.importedAt + 1 : null
  const now        = new Date().toLocaleString('en-IN')

  pendingNums.forEach((rn, i) => {
    const rowResult = result.errors ? result.errors.find(e => e.row === pendingRows[i].diNo) : null
    const statusVal = rowResult ? ('✗ Error: ' + rowResult.error) : '✓ Imported'
    if (syncCol)    sheet.getRange(rn, syncCol).setValue(statusVal)
    if (importedCol) sheet.getRange(rn, importedCol).setValue(now)
  })

  return result
}


// ─────────────────────────────────────────────────────────────────────────────
// Builds one row's payload object from the sheet row array
// ─────────────────────────────────────────────────────────────────────────────
function buildRowPayload(row, idx) {
  function get(key) {
    if (idx[key] === undefined) return ''
    const val = row[idx[key]]
    if (val instanceof Date) return val.toISOString().split('T')[0]
    return val !== null && val !== undefined ? String(val).trim() : ''
  }

  return {
    diNo:                get('diNo'),
    company:             get('company')    || 'SOM',
    customerName:        get('customerName'),
    orderType:           get('orderType')  || 'DOMESTIC',
    orderDate:           get('orderDate'),
    etd:                 get('etd'),
    priority:            get('priority')   || 'MODERATE',
    customerProductName: get('customerProductName'),
    inhouseProductName:  get('inhouseProductName'),
    inhouseProductCode:  get('inhouseProductCode'),
    activeSpecs:         get('activeSpecs'),
    activeIngredient:    get('activeIngredient'),
    carrier:             get('carrier'),
    sectionName:         get('sectionName'),
    totalQty:            get('totalQty'),
    totalUom:            get('totalUom')   || 'KG',
    unitQty:             get('unitQty'),
    unitUom:             get('unitUom'),
    unitPackType:        get('unitPackType'),
    packingType:         get('packingType'),
    totalCS:             get('totalCS'),
    labelType:           get('labelType'),
    mrp:                 get('mrp'),
    salesStaff:          get('salesStaff'),
    remarks:             get('remarks'),
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Adds a "SOM ERP" menu to the sheet for quick access
// ─────────────────────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SOM ERP')
    .addItem('Sync Now', 'manualSync')
    .addItem('Setup Triggers (run once)', 'setupTriggers')
    .addToUi()
}


// ─────────────────────────────────────────────────────────────────────────────
// One-time helper: creates the sheet with correct headers + formatting
// Run from Apps Script editor: Tools → Run → createSheetTemplate
// ─────────────────────────────────────────────────────────────────────────────
function createSheetTemplate() {
  const ss    = SpreadsheetApp.getActive()
  let   sheet = ss.getSheetByName(SHEET_NAME)

  if (sheet) {
    const ui  = SpreadsheetApp.getUi()
    const ans = ui.alert(
      'Sheet Exists',
      'A sheet named "' + SHEET_NAME + '" already exists. Overwrite headers?',
      ui.ButtonSet.YES_NO
    )
    if (ans !== ui.Button.YES) return
  } else {
    sheet = ss.insertSheet(SHEET_NAME)
  }

  // Write headers in order
  const headers = Object.values(COL_MAP)
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])

  // Freeze header row
  sheet.setFrozenRows(1)

  // Style header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length)
  headerRange.setBackground('#1F497D')
  headerRange.setFontColor('#FFFFFF')
  headerRange.setFontWeight('bold')
  headerRange.setFontSize(10)

  // Style the auto-filled columns (Sync Status & Imported At) differently
  const syncColIdx = headers.indexOf('Sync Status') + 1
  const importedColIdx = headers.indexOf('Imported At') + 1
  if (syncColIdx > 0) {
    sheet.getRange(1, syncColIdx).setBackground('#37864A')
    sheet.getRange(2, syncColIdx, 500, 1).setBackground('#E8F5E9')
  }
  if (importedColIdx > 0) {
    sheet.getRange(1, importedColIdx).setBackground('#37864A')
    sheet.getRange(2, importedColIdx, 500, 1).setBackground('#E8F5E9')
  }

  // Set column widths (in pixels)
  const widths = {
    'DI No': 120, 'Company': 80, 'Customer Name': 180, 'Order Type': 100,
    'Order Date': 100, 'ETD': 100, 'Priority': 90,
    'Customer Product Name': 200, 'Inhouse Product Name': 200,
    'Inhouse Product Code': 140, 'Active Specs': 130, 'Active Ingredient': 140,
    'Carrier': 100, 'Section': 100, 'Total Qty': 80, 'UOM': 60,
    'Unit Qty': 80, 'Unit UOM': 70, 'Unit Pack Type': 110, 'Packing Type': 100,
    'Total CS': 80, 'Label Type': 100, 'MRP': 80,
    'Sales Staff': 120, 'Remarks': 180,
    'Sync Status': 130, 'Imported At': 150,
  }
  headers.forEach((h, i) => {
    if (widths[h]) sheet.setColumnWidth(i + 1, widths[h])
  })

  // Data validation for dropdown columns
  const maxRows = 500

  // Company dropdown
  const companyCol = headers.indexOf('Company') + 1
  if (companyCol > 0) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['SOM', 'DVS', 'AL-IPL', 'AL-PTE'], true).build()
    sheet.getRange(2, companyCol, maxRows).setDataValidation(rule)
  }

  // Order Type dropdown
  const orderTypeCol = headers.indexOf('Order Type') + 1
  if (orderTypeCol > 0) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['DOMESTIC', 'EXPORT', 'SAMPLE'], true).build()
    sheet.getRange(2, orderTypeCol, maxRows).setDataValidation(rule)
  }

  // Priority dropdown
  const priorityCol = headers.indexOf('Priority') + 1
  if (priorityCol > 0) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['MODERATE', 'URGENT', 'VERY_URGENT'], true).build()
    sheet.getRange(2, priorityCol, maxRows).setDataValidation(rule)
  }

  // Section dropdown
  const sectionCol = headers.indexOf('Section') + 1
  if (sectionCol > 0) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['NANO', 'BOTANICAL', 'LIQUID', 'POWDER', 'GRANULES'], true).build()
    sheet.getRange(2, sectionCol, maxRows).setDataValidation(rule)
  }

  // UOM dropdown
  const uomCol = headers.indexOf('UOM') + 1
  if (uomCol > 0) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['KG', 'LTR', 'GM', 'ML', 'NOS'], true).build()
    sheet.getRange(2, uomCol, maxRows).setDataValidation(rule)
  }

  // Protect the auto-filled columns from editing
  const syncProt = sheet.getRange(2, syncColIdx, maxRows).protect()
  syncProt.setDescription('Auto-filled by ERP sync')
  syncProt.setWarningOnly(true)

  SpreadsheetApp.getUi().alert(
    '✅ Sheet Created!',
    '"' + SHEET_NAME + '" tab is ready.\n\n' +
    'Next: run setupTriggers() once to enable auto-sync.\n\n' +
    'Green columns (Sync Status, Imported At) are auto-filled — do not edit them.',
    SpreadsheetApp.getUi().ButtonSet.OK
  )
}
