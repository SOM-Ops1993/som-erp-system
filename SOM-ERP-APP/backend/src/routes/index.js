import rmMasterRoutes      from './rm-master.js'
import productMasterRoutes  from './product-master.js'
import equipmentMasterRoutes from './equipment-master.js'
import printMasterRoutes    from './print-master.js'
import inwardRoutes         from './inward.js'
import outwardRoutes        from './outward.js'
import indentRoutes         from './indent.js'
import recipeRoutes         from './recipe.js'
import stockRoutes          from './stock.js'
import ledgerRoutes         from './ledger.js'
import importRoutes         from './import.js'
import sfgRoutes            from './sfg.js'
import trackerRoutes        from './tracker.js'
import grnRoutes            from './grn.js'
import productionRoutes     from './production.js'
import bulkLocationRoutes   from './bulk-location.js'

// Microbial SFG Module
import microbialSfgMasterRoutes   from './microbial-sfg-master.js'
import microbialSfgInwardRoutes   from './microbial-sfg-inward.js'
import microbialSfgPlanningRoutes from './microbial-sfg-planning.js'

// ERP Module
import authRoutes           from './auth.js'
import erpMastersRoutes     from './erp-masters.js'
import erpGateRoutes        from './erp-gate.js'
import erpInventoryRoutes   from './erp-inventory.js'
import erpSalesRoutes       from './erp-sales.js'
import erpPlanningRoutes    from './erp-planning.js'
import erpBomIssuanceRoutes from './erp-bom-issuance.js'
import erpMicrobialRoutes   from './erp-microbial.js'
import erpNotifRoutes       from './erp-notifications.js'
import erpExportRoutes      from './erp-export.js'
import erpEmployeeRoutes    from './erp-employees.js'
import erpSalesOrderRoutes  from './erp-sales-orders.js'
import erpPlanEngineRoutes  from './erp-plan-engine.js'
import customerProfileRoutes from './customer-profiles.js'
import customerProductProfileRoutes from './customer-product-profiles.js'
import bomSendRoutes from './bom-sends.js'
import bmrRoutes     from './bmr.js'
import configurableOptionRoutes from './configurable-options.js'

export async function registerRoutes(fastify) {
  fastify.register(rmMasterRoutes,        { prefix: '/api/rm' })
  fastify.register(productMasterRoutes,   { prefix: '/api/products' })
  fastify.register(equipmentMasterRoutes, { prefix: '/api/equipment' })
  fastify.register(printMasterRoutes,     { prefix: '/api/packs' })
  fastify.register(inwardRoutes,          { prefix: '/api/inward' })
  fastify.register(outwardRoutes,         { prefix: '/api/outward' })
  fastify.register(indentRoutes,          { prefix: '/api/indent' })
  fastify.register(recipeRoutes,          { prefix: '/api/recipe' })
  fastify.register(stockRoutes,           { prefix: '/api/stock' })
  fastify.register(ledgerRoutes,          { prefix: '/api/ledger' })
  fastify.register(importRoutes,          { prefix: '/api/import' })
  fastify.register(sfgRoutes,             { prefix: '/api/sfg' })
  fastify.register(trackerRoutes,         { prefix: '/api/tracker' })
  fastify.register(grnRoutes,             { prefix: '/api/grn' })
  fastify.register(productionRoutes,      { prefix: '/api/production' })
  fastify.register(bulkLocationRoutes,    { prefix: '/api/bulk' })
  fastify.register(microbialSfgMasterRoutes,   { prefix: '/api/microbial-sfg/masters' })
  fastify.register(microbialSfgInwardRoutes,   { prefix: '/api/microbial-sfg/inward' })
  fastify.register(microbialSfgPlanningRoutes, { prefix: '/api/microbial-sfg/planning' })
  fastify.register(authRoutes,            { prefix: '/api/auth' })
  fastify.register(erpMastersRoutes,      { prefix: '/api/erp/masters' })
  fastify.register(erpGateRoutes,         { prefix: '/api/erp/gate' })
  fastify.register(erpInventoryRoutes,    { prefix: '/api/erp/inventory' })
  fastify.register(erpSalesRoutes,        { prefix: '/api/erp/sales' })
  fastify.register(erpPlanningRoutes,     { prefix: '/api/erp/planning' })
  fastify.register(erpBomIssuanceRoutes,  { prefix: '/api/erp/bom-issuance' })
  fastify.register(erpMicrobialRoutes,    { prefix: '/api/erp/microbial' })
  fastify.register(erpNotifRoutes,        { prefix: '/api/erp/notifications' })
  fastify.register(erpExportRoutes,       { prefix: '/api/erp/export' })
  fastify.register(erpEmployeeRoutes,     { prefix: '/api/erp/employees' })
  fastify.register(erpSalesOrderRoutes,   { prefix: '/api/erp/sales-orders' })
  fastify.register(erpPlanEngineRoutes,   { prefix: '/api/erp/plan-engine' })
  fastify.register(customerProfileRoutes,  { prefix: '/api/customer-profiles' })
  fastify.register(customerProductProfileRoutes, { prefix: '/api/cp-profiles' })
  fastify.register(bomSendRoutes,              { prefix: '/api/bom-sends' })
  fastify.register(bmrRoutes,                  { prefix: '/api/bmr' })
  fastify.register(configurableOptionRoutes,   { prefix: '/api/config-options' })
}
