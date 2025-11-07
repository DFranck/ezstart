import { Router } from '@ezstart/express-core'
import chatRoutes, { chatRegistries } from './chat/index.js'
import chatV2Routes, { chatV2Registry } from './chat-v2.js'
import uploadRoutes, { uploadRegistries } from './upload/index.js'
import esgRoutes, { esgRegistries } from './esg/index.js'
import webhookRoutes, { webhookRegistries } from './webhooks/index.js'
import conversationRoutes, { conversationRegistries } from './conversations/index.js'
import formRoutes, { formRegistries } from './forms/index.js'
import projectRoutes, { projectRegistries } from './projects/index.js'
import workspaceRoutes, { workspaceRegistries } from './workspaces/index.js'
import themeRoutes, { themeRegistries } from './theme/index.js'

const router: any = Router()

export const globalRegistry = [
  ...chatRegistries,
  chatV2Registry,
  ...uploadRegistries,
  ...esgRegistries,
  ...webhookRegistries,
  ...conversationRegistries, // Spread the array of conversation registries
  ...formRegistries,         // Spread the array of form registries
  ...projectRegistries,      // Spread the array of project registries
  ...workspaceRegistries,    // Spread the array of workspace registries
  ...themeRegistries,        // Spread the array of theme registries
]

router
  .use('/chat', chatRoutes)
  .use('/chat-v2', chatV2Routes) // New endpoint using @ezstart/ai-sdk
  .use('/upload', uploadRoutes)
  .use('/esg', esgRoutes)
  .use('/webhooks', webhookRoutes)
  .use('/conversations', conversationRoutes)
  .use('/forms', formRoutes)
  .use('/projects', projectRoutes)
  .use('/workspaces', workspaceRoutes)
  .use('/theme', themeRoutes)

export default router