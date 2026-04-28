import { Router, sendSuccess } from '@ezstart/api-core'
import { donationsRegistries, donationsRouters } from './donations/index.js'
import { purchasesRegistries, purchasesRouters } from './purchases/index.js'
import { subscriptionsRegistries, subscriptionsRouters } from './subscriptions/index.js'
import { paymentsRegistries, paymentsRouters } from './payments/index.js'
import { promosRegistries, promosRouters } from './promos/index.js'
import { plansRegistries, plansRouters } from './plans/index.js'
import { connectRegistries, connectRouters } from './connect/index.js'
import { apiKeyRegistries, apiKeyRouters } from './api-keys/index.js'
import { billingRegistries, billingRouters } from './billing/index.js'
import { adminRegistries, adminRouters } from './admin/index.js'
import webhooksRouter from './webhooks.js'
import webhooksConnectRouter from './webhooks-connect.js'
import testProductsRouter from './test-products.js'
import type { Router as ExpressRouter } from 'express'

const router: ExpressRouter = Router()

// Mount routes
donationsRouters.forEach(r => router.use('/', r))
purchasesRouters.forEach(r => router.use('/', r))
subscriptionsRouters.forEach(r => router.use('/', r))
paymentsRouters.forEach(r => router.use('/', r))
promosRouters.forEach(r => router.use('/', r))
plansRouters.forEach(r => router.use('/', r))
connectRouters.forEach(r => router.use('/', r))
apiKeyRouters.forEach(r => router.use('/', r))
billingRouters.forEach(r => router.use('/billing', r))
adminRouters.forEach(r => router.use('/', r))
router.use('/', webhooksRouter)
router.use('/', webhooksConnectRouter)
router.use('/', testProductsRouter)

// Health check
router.get('/health', (_, res) => {
  sendSuccess(res, { status: 'ok', service: 'EZPay API' })
})

export const registries = [
  ...donationsRegistries,
  ...purchasesRegistries,
  ...subscriptionsRegistries,
  ...paymentsRegistries,
  ...promosRegistries,
  ...plansRegistries,
  ...connectRegistries,
  ...apiKeyRegistries,
  ...billingRegistries,
  ...adminRegistries,
]
export default router
