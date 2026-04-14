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

// Feature children own their basePath via createRouterWithDoc(..., '/<resource>')
// so they are mounted at '/' here to avoid double-mount with the helper basePath.
router.use(uploadRoutes).use(esgRoutes).use(webhookRoutes).use(themeRoutes)

export default router
