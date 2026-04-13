import { Router } from '@ezstart/express-core'
import healthRouter, { healthRegistries } from './health/index.js'
import auditRouter, { auditRegistries } from './audit/index.js'
import deploymentRouter, { deploymentRegistries } from './deployment/index.js'
import metricsRouter, { metricsRegistries } from './metrics/index.js'
import projectsRouter from './projects/index.js'
import historyRouter from './history/index.js'
import triggerRouter from './trigger.js'
import activityRouter from './activity/index.js'
import performanceRouter from './performance/index.js'
import schedulerRouter, { setScheduler } from './scheduler/index.js'
import aiRouter from './ai/index.js'
import { conversationRegistries } from './ai/conversations/index.js'
import { promptsRegistries } from './ai/prompts/index.js'
import { sendMessageRegistry } from './ai/chat/sendMessage.js'
import { providersRegistry } from './ai/providers/index.js'
import { appProvidersRegistries } from './ai/app-providers/index.js'
import { globalProvidersRegistries } from './ai/global-providers/index.js'
import qrCodesRouter, { qrCodeRegistries } from './qr-codes/index.js'
import adminRouter, { adminRegistries } from './admin/index.js'

const router = Router()

// Mount sub-routes
router.use('/health-checks', healthRouter)
router.use('/audits', auditRouter)
router.use('/deployments', deploymentRouter)
router.use('/metrics', metricsRouter)
router.use('/projects', projectsRouter)
router.use('/history', historyRouter)
router.use('/trigger-checks', triggerRouter)
router.use('/activity', activityRouter)
router.use('/performance', performanceRouter)
router.use('/scheduler', schedulerRouter)
router.use('/ai', aiRouter)
router.use('/qr-codes', qrCodesRouter)
router.use('/admin', adminRouter)

// Root endpoint
router.get('/', (_, res) => {
  res.json({
    message: 'Monitoring API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      healthChecks: '/api/health-checks',
      projects: '/api/projects',
      audits: '/api/audits',
      deployments: '/api/deployments',
      metrics: '/api/metrics',
      history: '/api/history/:serviceId',
      projectHistory: '/api/history/project/:projectId',
      activity: '/api/activity',
      activityErrors: '/api/activity/errors',
      activityStats: '/api/activity/stats',
      performance: '/api/performance/:serviceId',
      performanceEndpoints: '/api/performance/:serviceId/endpoints',
      scheduler: '/api/scheduler/status',
      schedulerService: '/api/scheduler/service/:serviceId',
      ai: '/api/ai',
      aiChat: '/api/ai/chat',
      aiConversations: '/api/ai/conversations',
      aiPrompts: '/api/ai/prompts',
      aiProviders: '/api/ai/providers',
      aiAppProviders: '/api/ai/app-providers',
      aiGlobalProviders: '/api/ai/global-providers',
      qrCodes: '/api/qr-codes',
      adminServices: '/api/admin/services',
      docs: '/api/docs',
    },
  })
})

export const routes = router as ReturnType<typeof Router>
export const registries = [
  ...healthRegistries,
  ...auditRegistries,
  ...deploymentRegistries,
  ...metricsRegistries,
  ...conversationRegistries,
  ...promptsRegistries,
  sendMessageRegistry,
  providersRegistry,
  ...appProvidersRegistries,
  ...globalProvidersRegistries,
  ...qrCodeRegistries,
  ...adminRegistries,
]

// Re-export setScheduler for backward compatibility
export { setScheduler }
