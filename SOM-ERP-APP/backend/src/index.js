import rmMasterRoutes             from './rm-master.js'
import productMasterRoutes         from './product-master.js'
import equipmentMasterRoutes       from './equipment-master.js'
import printMasterRoutes           from './print-master.js'
import inwardRoutes                from './inward.js'
import outwardRoutes               from './outward.js'
import indentRoutes                from './indent.js'
import recipeRoutes                from './recipe.js'
import stockRoutes                 from './stock.js'
import ledgerRoutes                from './ledger.js'
import importRoutes                from './import.js'
import sfgRoutes                   from './sfg.js'
import trackerRoutes               from './tracker.js'
import grnRoutes                   from './grn.js'
import productionRoutes            from './production.js'
import bulkLocationRoutes          from './bulk-location.js'
import microbialSfgMasterRoutes    from './microbial-sfg-master.js'
import microbialSfgInwardRoutes    from './microbial-sfg-inward.js'
import microbialSfgPlanningRoutes  from './microbial-sfg-planning.js'
import authRoutes                  from './auth.js'
import erpMastersRoutes            from './erp-masters.js'
import erpGateRoutes               from './erp-gate.js'
import erpInventoryRoutes          from './erp-inventory.js'
import erpSalesRoutes              from './erp-sales.js'
import erpPlanningRoutes           from './erp-planning.js'
import erpBomIssuanceRoutes        from './erp-bom-issuance.js'
import erpMicrobialRoutes          from './erp-microbial.js'
import erpNotifRoutes              from './erp-notifications.js'
import erpExportRoutes             from './erp-export.js'
import erpEmployeeRoutes           from './erp-employees.js'
import erpSalesOrderRoutes         from './erp-sales-orders.js'
import erpPlanEngineRoutes         from './erp-plan-engine.js'
import customerProfileRoutes       from './customer-profiles.js'
import customerProductProfileRoutes from './customer-product-profiles.js'
import bomSendRoutes               from './bom-sends.js'

// ─────────────────────────────────────────────────────────────────────────────
// registerRoutes
// Replaces the Fastify version that used fastify.register(fn, { prefix })
// In Express each route file exports a Router and we mount it with app.use()
// ─────────────────────────────────────────────────────────────────────────────
export function registerRoutes(app) {
  app.use('/api/rm',                        rmMasterRoutes)
  app.use('/api/products',                  productMasterRoutes)
  app.use('/api/equipment',                 equipmentMasterRoutes)
  app.use('/api/packs',                     printMasterRoutes)
  app.use('/api/inward',                    inwardRoutes)
  app.use('/api/outward',                   outwardRoutes)
  app.use('/api/indent',                    indentRoutes)
  app.use('/api/recipe',                    recipeRoutes)
  app.use('/api/stock',                     stockRoutes)
  app.use('/api/ledger',                    ledgerRoutes)
  app.use('/api/import',                    importRoutes)
  app.use('/api/sfg',                       sfgRoutes)
  app.use('/api/tracker',                   trackerRoutes)
  app.use('/api/grn',                       grnRoutes)
  app.use('/api/production',                productionRoutes)
  app.use('/api/bulk',                      bulkLocationRoutes)
  app.use('/api/microbial-sfg/masters',     microbialSfgMasterRoutes)
  app.use('/api/microbial-sfg/inward',      microbialSfgInwardRoutes)
  app.use('/api/microbial-sfg/planning',    microbialSfgPlanningRoutes)
  app.use('/api/auth',                      authRoutes)
  app.use('/api/erp/masters',               erpMastersRoutes)
  app.use('/api/erp/gate',                  erpGateRoutes)
  app.use('/api/erp/inventory',             erpInventoryRoutes)
  app.use('/api/erp/sales',                 erpSalesRoutes)
  app.use('/api/erp/planning',              erpPlanningRoutes)
  app.use('/api/erp/bom-issuance',          erpBomIssuanceRoutes)
  app.use('/api/erp/microbial',             erpMicrobialRoutes)
  app.use('/api/erp/notifications',         erpNotifRoutes)
  app.use('/api/erp/export',                erpExportRoutes)
  app.use('/api/erp/employees',             erpEmployeeRoutes)
  app.use('/api/erp/sales-orders',          erpSalesOrderRoutes)
  app.use('/api/erp/plan-engine',           erpPlanEngineRoutes)
  app.use('/api/customer-profiles',         customerProfileRoutes)
  app.use('/api/cp-profiles',               customerProductProfileRoutes)
  app.use('/api/bom-sends',                 bomSendRoutes)
}
