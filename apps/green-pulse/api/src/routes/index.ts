import { Router } from '@ezstart/express-core'
import chatRoutes, { chatRegistry } from './chat.js'
import uploadRoutes, { uploadRegistry } from './upload.js'
import esgRoutes, { esgRegistry } from './esg.js'
import webhookRoutes, { webhookRegistry } from './webhooks.js'
import conversationRoutes, { conversationRegistry } from './conversations.js'
import formRoutes, { formRegistry } from './forms.js'
import projectRoutes, { projectRegistry } from './projects.js'
import workspaceRoutes, { workspaceRegistry } from './workspaces.js'

const router: any = Router()

export const globalRegistry = [
  chatRegistry,
  uploadRegistry,
  esgRegistry,
  webhookRegistry,
  conversationRegistry,
  formRegistry,
  projectRegistry,
  workspaceRegistry,
]

router
  .use('/chat', chatRoutes)
  .use('/upload', uploadRoutes)
  .use('/esg', esgRoutes)
  .use('/webhooks', webhookRoutes)
  .use('/conversations', conversationRoutes)
  .use('/forms', formRoutes)
  .use('/projects', projectRoutes)
  .use('/workspaces', workspaceRoutes)

export default router