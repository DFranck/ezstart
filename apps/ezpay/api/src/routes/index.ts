import { Router } from '@ezstart/express-core'
import { donationsRegistries, donationsRouters } from './donations/index.js'
import webhooksRouter from './webhooks.js'
import type { Router as ExpressRouter } from 'express'

const router: ExpressRouter = Router()

// Mount routes
donationsRouters.forEach(r => router.use('/', r))
router.use('/', webhooksRouter)

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'EZPay API' })
})

export const registries = [...donationsRegistries]
export default router
