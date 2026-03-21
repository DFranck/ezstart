import { Router } from '@ezstart/express-core'
import { donationsRegistries, donationsRouters } from './donations/index.js'
import { purchasesRegistries, purchasesRouters } from './purchases/index.js'
import { subscriptionsRegistries, subscriptionsRouters } from './subscriptions/index.js'
import { paymentsRegistries, paymentsRouters } from './payments/index.js'
import webhooksRouter from './webhooks.js'
import type { Router as ExpressRouter } from 'express'

const router: ExpressRouter = Router()

// Mount routes
donationsRouters.forEach(r => router.use('/', r))
purchasesRouters.forEach(r => router.use('/', r))
subscriptionsRouters.forEach(r => router.use('/', r))
paymentsRouters.forEach(r => router.use('/', r))
router.use('/', webhooksRouter)

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'EZPay API' })
})

export const registries = [
  ...donationsRegistries,
  ...purchasesRegistries,
  ...subscriptionsRegistries,
  ...paymentsRegistries,
]
export default router
