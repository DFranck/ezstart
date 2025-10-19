import { Router } from '@ezstart/express-core'
import donationsRouter, { donationsRegistry } from './donations.js'
import webhooksRouter from './webhooks.js'
import type { Router as ExpressRouter } from 'express'

const router: ExpressRouter = Router()

// Mount routes
router.use('/', donationsRouter)
router.use('/', webhooksRouter)

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'EZPay API' })
})

export const registries = [donationsRegistry]
export default router
