import { Router } from '@ezstart/express-core'
import uploadRoutes, { uploadRegistries } from './upload/index.js'
import esgRoutes, { esgRegistries } from './esg/index.js'
import webhookRoutes, { webhookRegistries } from './webhooks/index.js'
import formRoutes, { formRegistries } from './forms/index.js'
import projectRoutes, { projectRegistries } from './projects/index.js'
import workspaceRoutes, { workspaceRegistries } from './workspaces/index.js'
import themeRoutes, { themeRegistries } from './theme/index.js'

const router: import('express').Router = Router()

export const globalRegistry = [
  ...uploadRegistries,
  ...esgRegistries,
  ...webhookRegistries,
  ...formRegistries,
  ...projectRegistries,
  ...workspaceRegistries,
  ...themeRegistries,
]

router
  .use('/upload', uploadRoutes)
  .use('/esg', esgRoutes)
  .use('/webhooks', webhookRoutes)
  .use('/forms', formRoutes)
  .use('/projects', projectRoutes)
  .use('/workspaces', workspaceRoutes)
  .use('/theme', themeRoutes)

export default router
