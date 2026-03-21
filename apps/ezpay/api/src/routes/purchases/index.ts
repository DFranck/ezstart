import { registry as createPurchaseRegistry, router as createPurchaseRouter } from './create.js'
import { registry as listPurchasesRegistry, router as listPurchasesRouter } from './list.js'

export const purchasesRegistries = [
  createPurchaseRegistry,
  listPurchasesRegistry,
]

export const purchasesRouters = [
  createPurchaseRouter,
  listPurchasesRouter,
]
