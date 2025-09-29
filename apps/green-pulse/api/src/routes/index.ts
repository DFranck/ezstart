import { Router } from '@ezstart/express-core'
import chatRoutes, { chatRegistry } from './chat.js'
import uploadRoutes, { uploadRegistry } from './upload.js'
import esgRoutes, { esgRegistry } from './esg.js'
import webhookRoutes, { webhookRegistry } from './webhooks.js'

const router: any = Router()

export const globalRegistry = [
  chatRegistry,
  uploadRegistry,
  esgRegistry,
  webhookRegistry,
]

router
  .use('/chat', chatRoutes)
  .use('/upload', uploadRoutes)
  .use('/esg', esgRoutes)
  .use('/webhooks', webhookRoutes)

export default router