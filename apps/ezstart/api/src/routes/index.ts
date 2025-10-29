import { Router } from '@ezstart/express-core'
import { healthRoutes, healthRegistry } from './health.js'
import { auditRoutes, auditRegistry } from './audit.js'
import { deploymentRoutes, deploymentRegistry } from './deployment.js'
import { metricsRoutes, metricsRegistry } from './metrics.js'
import projectsRouter from './projects.js'
import historyRouter from './history.js'
import triggerRouter from './trigger.js'
import activityRouter from './activity.js'
import { schedulerRoutes } from './scheduler.js'

const router = Router()

// Mount sub-routes
router.use('/health-checks', healthRoutes)
router.use('/audits', auditRoutes)
router.use('/deployments', deploymentRoutes)
router.use('/metrics', metricsRoutes)
router.use('/projects', projectsRouter)
router.use('/history', historyRouter)
router.use('/trigger-checks', triggerRouter)
router.use('/activity', activityRouter)
router.use('/scheduler', schedulerRoutes)

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
      scheduler: '/api/scheduler/status',
      schedulerService: '/api/scheduler/service/:serviceId',
      docs: '/api/docs',
    },
  })
})

export const routes = router as ReturnType<typeof Router>
export const registries = [healthRegistry, auditRegistry, deploymentRegistry, metricsRegistry]
