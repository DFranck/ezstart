import { Router } from '@ezstart/express-core'
import uploadRoutes, { uploadRegistries } from './upload/index.js'
import esgRoutes, { esgRegistries } from './esg/index.js'
import webhookRoutes, { webhookRegistries } from './webhooks/index.js'
import themeRoutes, { themeRegistries } from './theme/index.js'

const router: import('express').Router = Router()

export const globalRegistry = [
  ...uploadRegistries,
  ...esgRegistries,
  ...webhookRegistries,
  ...themeRegistries,
]

router
  .use('/upload', uploadRoutes)
  .use('/esg', esgRoutes)
  .use('/webhooks', webhookRoutes)
  .use('/theme', themeRoutes)

export default router
