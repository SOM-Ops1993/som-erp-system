import prisma from '../../../db.js';

// ─── Model registry ───────────────────────────────────────────────────────────
// idField:  string → simple PK field name
//           array  → composite PK [f1, f2]
// idType:   'int'    → parse id param as integer
//           'bigint' → parse id param as BigInt (BIGSERIAL PKs)
//           default  → string
// orderBy:  Prisma orderBy clause (omit if model has no usable sort column)

export const MODELS = {
  // ── Inventory ──────────────────────────────────────────────────────────────
  'rm-master':          { model: 'rmMaster',              idField: 'itemCode',                orderBy: { createdAt: 'desc' } },
  'bulk-location':      { model: 'bulkLocation',           idField: 'locationId',              orderBy: { createdAt: 'desc' } },
  'bulk-lot-entry':     { model: 'bulkLotEntry',           idField: 'id',                      orderBy: { createdAt: 'desc' } },
  'bulk-lot-sequence':  { model: 'bulkLotSequence',        idField: ['itemCode', 'year'],       orderBy: { year: 'desc' } },
  'lot-sequence':       { model: 'lotSequence',            idField: ['itemCode', 'year'],       orderBy: { year: 'desc' } },
  'print-master':       { model: 'printMaster',            idField: 'packId',                  orderBy: { createdAt: 'desc' } },
  'inward-session':     { model: 'inwardSession',          idField: 'sessionId',               orderBy: { createdAt: 'desc' } },
  'inward':             { model: 'inward',                 idField: 'id',                      orderBy: { inwardTime: 'desc' } },
  'pack-balance':       { model: 'packBalance',            idField: 'packId'                                                  },
  'container-master':   { model: 'containerMaster',        idField: 'containerId'                                             },
  'stock-ledger':       { model: 'stockLedger',            idField: 'id',                      orderBy: { timestamp: 'desc' } },
  'outward':            { model: 'outward',                idField: 'id',                      orderBy: { timestamp: 'desc' } },

  // ── Sales ──────────────────────────────────────────────────────────────────
  'sales-order':               { model: 'salesOrder',             idField: 'id',         orderBy: { createdAt: 'desc' } },
  'sales-order-item':          { model: 'salesOrderItem',         idField: 'id',         orderBy: { createdAt: 'desc' } },
  'so-sequence':               { model: 'soSequence',             idField: 'year', idType: 'int', orderBy: { year: 'desc' } },
  'customer-profile':          { model: 'customerProfile',        idField: 'id',         orderBy: { updatedAt: 'desc' } },
  'customer-product-profile':  { model: 'customerProductProfile', idField: 'id',         orderBy: { lastOrderedAt: 'desc' } },
  'sheet-sync-log':            { model: 'sheetSyncLog',           idField: 'id',         orderBy: { createdAt: 'desc' } },

  // ── Production ─────────────────────────────────────────────────────────────
  'product-master':     { model: 'productMaster',    idField: 'productCode',  orderBy: { createdAt: 'desc' } },
  'equipment-master':   { model: 'equipmentMaster',  idField: 'equipId',      orderBy: { createdAt: 'desc' } },
  'recipe-db':          { model: 'recipeDb',         idField: 'id',           orderBy: { productCode: 'asc' } },
  'indent-master':      { model: 'indentMaster',     idField: 'indentId',     orderBy: { createdAt: 'desc' } },
  'indent-details':     { model: 'indentDetails',    idField: 'id'                                           },
  'sfg-master':         { model: 'sfgMaster',        idField: 'sfgId',        orderBy: { createdAt: 'desc' } },
  'production-batch':   { model: 'productionBatch',  idField: 'id',           orderBy: { createdAt: 'desc' } },
  'biomass-input':      { model: 'biomassInput',     idField: 'id'                                           },
  'technical-detail':   { model: 'technicalDetail',  idField: 'id'                                           },
  'formulation-cycle':  { model: 'formulationCycle', idField: 'id'                                           },
  'unloading-log':      { model: 'unloadingLog',     idField: 'id'                                           },
  'sieving-log':        { model: 'sievingLog',       idField: 'id'                                           },
  'packing-log':        { model: 'packingLog',       idField: 'id'                                           },
  'qc-sample':          { model: 'qcSample',         idField: 'id'                                           },
  'inventory-handover': { model: 'inventoryHandover',idField: 'id'                                           },

  // ── Planning ───────────────────────────────────────────────────────────────
  'production-plan':  { model: 'productionPlan', idField: 'id',   orderBy: { createdAt: 'desc' } },
  'plan-sequence':    { model: 'planSequence',   idField: 'year', idType: 'int', orderBy: { year: 'desc' } },
  'planner-log':      { model: 'plannerLog',     idField: 'id',   orderBy: { runAt: 'desc' } },
  'bom-send':         { model: 'bomSend',        idField: 'id',   orderBy: { sentAt: 'desc' } },

  // ── HR ─────────────────────────────────────────────────────────────────────
  'company-master':   { model: 'companyMaster',  idField: 'id',   orderBy: { createdAt: 'desc' } },
  'employee-master':  { model: 'employeeMaster', idField: 'id',   orderBy: { createdAt: 'desc' } },
  'role-permission':  { model: 'rolePermission', idField: 'id'                                   },

  // ── System ─────────────────────────────────────────────────────────────────
  'users':     { model: 'user',     idField: 'userId',  orderBy: { createdAt: 'desc' } },
  'audit-log': { model: 'auditLog', idField: 'id', idType: 'bigint', orderBy: { createdAt: 'desc' } },

  // ── ERP Masters ────────────────────────────────────────────────────────────
  'reason-codes':          { model: 'reasonCode',         idField: 'codeId',       idType: 'int', orderBy: { category: 'asc' } },
  'erp-suppliers':         { model: 'erpSupplier',        idField: 'supplierId',   orderBy: { supplierName: 'asc' } },
  'erp-plants':            { model: 'erpPlant',           idField: 'plantId',      orderBy: { plantName: 'asc' } },
  'erp-equipment':         { model: 'erpEquipment',       idField: 'equipmentId',  orderBy: { equipmentName: 'asc' } },
  'erp-items':             { model: 'erpItem',            idField: 'itemCode',     orderBy: { itemName: 'asc' } },
  'customers':             { model: 'customer',           idField: 'customerId',   orderBy: { customerName: 'asc' } },
  'erp-products':          { model: 'erpProduct',         idField: 'productCode',  orderBy: { productName: 'asc' } },
  'bom-headers':           { model: 'erpBomHeader',       idField: 'bomId',        orderBy: { createdAt: 'desc' } },
  'bom-lines-formulation': { model: 'erpBomLineFormulation', idField: 'id'                                         },
  'bom-lines-packing':     { model: 'erpBomLinePacking',  idField: 'id'                                           },
  'gate-lot-sequences':    { model: 'gateLotSequence',    idField: ['itemCode', 'year'], orderBy: { year: 'desc' } },

  // ── ERP Inventory ──────────────────────────────────────────────────────────
  'gate-inward':         { model: 'gateInward',       idField: 'inwardId',    orderBy: { createdAt: 'desc' } },
  'erp-packs':           { model: 'erpPack',          idField: 'packId',      orderBy: { createdAt: 'desc' } },
  'gate-outward':        { model: 'gateOutward',      idField: 'outwardId',   orderBy: { createdAt: 'desc' } },
  'stock-adjustments':   { model: 'stockAdjustment',  idField: 'adjustmentId', orderBy: { raisedAt: 'desc' } },
  'warehouse-transfers': { model: 'warehouseTransfer', idField: 'transferId', orderBy: { initiatedAt: 'desc' } },
  'fifo-override-log':   { model: 'fifoOverrideLog',  idField: 'id',          orderBy: { createdAt: 'desc' } },
  'erp-containers':      { model: 'erpContainer',     idField: 'containerId', orderBy: { createdAt: 'desc' } },
  'decanting-log':       { model: 'decantingLog',     idField: 'id',          orderBy: { createdAt: 'desc' } },

  // ── ERP Sales (legacy) ─────────────────────────────────────────────────────
  'erp-sales-orders': { model: 'erpSalesOrder', idField: 'diNumber', orderBy: { createdAt: 'desc' } },
  'order-dispatch':   { model: 'orderDispatch', idField: 'dispatchId', orderBy: { createdAt: 'desc' } },

  // ── ERP Production ─────────────────────────────────────────────────────────
  'erp-production-plans':        { model: 'erpProductionPlan',      idField: 'planId',      orderBy: { createdAt: 'desc' } },
  'erp-production-jobs':         { model: 'erpProductionJob',       idField: 'jobId',       orderBy: { createdAt: 'desc' } },
  'job-equipment-assignments':   { model: 'jobEquipmentAssignment', idField: 'id'                                           },
  'erp-bom-issuance':            { model: 'erpBomIssuance',         idField: 'issuanceId',  orderBy: { issuedAt: 'desc' } },
  'batch-qc-records':            { model: 'batchQcRecord',          idField: 'qcId',        orderBy: { createdAt: 'desc' } },
  'production-loss-log':         { model: 'productionLossLog',      idField: 'id',          orderBy: { createdAt: 'desc' } },
  'time-motion-logs':            { model: 'timeMotionLog',          idField: 'id',          orderBy: { createdAt: 'desc' } },

  // ── Microbial ──────────────────────────────────────────────────────────────
  'microbial-strains':           { model: 'microbialStrain',          idField: 'strainId',      orderBy: { createdAt: 'desc' } },
  'microbial-containers':        { model: 'microbialContainer',       idField: 'containerId',   orderBy: { createdAt: 'desc' } },
  'microbial-transactions':      { model: 'microbialTransaction',     idField: 'id',            orderBy: { dispatchDate: 'desc' } },
  'microbe-master':              { model: 'microbeMaster',            idField: 'microbeId',     orderBy: { createdAt: 'desc' } },
  'microbial-sfg-container-seq': { model: 'microbialSfgContainerSeq', idField: ['microbeCode', 'typeCode'] },
  'microbial-sfg-containers':    { model: 'microbialSfgContainer',    idField: 'containerId',   orderBy: { createdAt: 'desc' } },
  'microbial-sfg-inward':        { model: 'microbialSfgInward',       idField: 'inwardId',      orderBy: { createdAt: 'desc' } },
  'microbial-sfg-allocations':   { model: 'microbialSfgAllocation',   idField: 'allocationId',  orderBy: { createdAt: 'desc' } },

  // ── Notifications ──────────────────────────────────────────────────────────
  'notifications':              { model: 'erpNotification',         idField: 'notifId',    orderBy: { createdAt: 'desc' } },
  'notification-escalations':   { model: 'notificationEscalation',  idField: 'id', idType: 'bigint', orderBy: { escalatedAt: 'desc' } },
  'notification-delivery-log':  { model: 'notificationDeliveryLog', idField: 'id', idType: 'bigint', orderBy: { sentAt: 'desc' } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getMeta(resource) {
  return MODELS[resource] || null;
}

export function buildWhere(meta, params) {
  if (Array.isArray(meta.idField)) {
    const [f1, f2] = meta.idField;
    const key = `${f1}_${f2}`;
    return {
      [key]: {
        [f1]: params.p1,
        [f2]: f2 === 'year' ? parseInt(params.p2) : params.p2,
      },
    };
  }
  const val = meta.idType === 'bigint'
    ? BigInt(params.id)
    : meta.idType === 'int'
      ? parseInt(params.id)
      : params.id;
  return { [meta.idField]: val };
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export const listRecords = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(500, parseInt(req.query.limit) || 200);
    const skip  = (page - 1) * limit;

    const opts = { skip, take: limit };
    if (meta.orderBy) opts.orderBy = meta.orderBy;
    const [total, records] = await Promise.all([
      prisma[meta.model].count(),
      prisma[meta.model].findMany(opts),
    ]);

    return res.json({ success: true, data: records, total, page, limit });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const where  = buildWhere(meta, req.params);
    const record = await prisma[meta.model].findUnique({ where });
    if (!record) return res.status(404).json({ success: false, error: 'Record not found', code: 'NOT_FOUND' });
    return res.json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

// GET /admin/stats — row counts for all tables (dashboard)
export const getStats = async (req, res) => {
  try {
    const counts = await Promise.all(
      Object.entries(MODELS).map(async ([key, meta]) => {
        try {
          const count = await prisma[meta.model].count();
          return [key, count];
        } catch {
          return [key, 0];
        }
      })
    );
    return res.json({ success: true, data: Object.fromEntries(counts) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}
