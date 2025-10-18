import { Router } from '@ezstart/express-core'
import { healthRoutes, healthRegistry } from './health.js'
import { auditRoutes, auditRegistry } from './audit.js'
import { deploymentRoutes, deploymentRegistry } from './deployment.js'
import { metricsRoutes, metricsRegistry } from './metrics.js'
import projectsRouter from './projects.js'
import historyRouter from './history.js'

const router = Router()

// Mount sub-routes
router.use('/health-checks', healthRoutes)
router.use('/audits', auditRoutes)
router.use('/deployments', deploymentRoutes)
router.use('/metrics', metricsRoutes)
router.use('/projects', projectsRouter)
router.use('/history', historyRouter)

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
      docs: '/api/docs',
    },
  })
})

export const routes = router
export const registries = [healthRegistry, auditRegistry, deploymentRegistry, metricsRegistry]
