import rmMasterRoutes from './rm-master.js'
import printMasterRoutes from './print-master.js'
import inwardRoutes from './inward.js'
import outwardRoutes from './outward.js'
import indentRoutes from './indent.js'
import recipeRoutes from './recipe.js'
import stockRoutes from './stock.js'
import ledgerRoutes from './ledger.js'
import importRoutes from './import.js'
import sfgRoutes from './sfg.js'
import productMasterRoutes from './product-master.js'

export async function registerRoutes(fastify) {
  fastify.register(rmMasterRoutes,       { prefix: '/api/rm' })
  fastify.register(printMasterRoutes,    { prefix: '/api/packs' })
  fastify.register(inwardRoutes,         { prefix: '/api/inward' })
  fastify.register(outwardRoutes,        { prefix: '/api/outward' })
  fastify.register(indentRoutes,         { prefix: '/api/indent' })
  fastify.register(recipeRoutes,         { prefix: '/api/recipe' })
  fastify.register(stockRoutes,          { prefix: '/api/stock' })
  fastify.register(ledgerRoutes,         { prefix: '/api/ledger' })
  fastify.register(importRoutes,         { prefix: '/api/import' })
  fastify.register(sfgRoutes,            { prefix: '/api/sfg' })
  fastify.register(productMasterRoutes,  { prefix: '/api/product-master' })
}
