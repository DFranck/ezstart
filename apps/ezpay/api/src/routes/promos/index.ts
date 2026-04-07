import { registry as createPromoRegistry, router as createPromoRouter } from './createPromo.js'
import { registry as listPromosRegistry, router as listPromosRouter } from './listPromos.js'
import { registry as validatePromoRegistry, router as validatePromoRouter } from './validatePromo.js'
import { registry as updatePromoRegistry, router as updatePromoRouter } from './updatePromo.js'
import { registry as deletePromoRegistry, router as deletePromoRouter } from './deletePromo.js'

export const promosRegistries = [
  createPromoRegistry,
  listPromosRegistry,
  validatePromoRegistry,
  updatePromoRegistry,
  deletePromoRegistry,
]

export const promosRouters = [
  createPromoRouter,
  listPromosRouter,
  validatePromoRouter,
  updatePromoRouter,
  deletePromoRouter,
]
