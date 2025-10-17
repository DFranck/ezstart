import { Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { healthRoutes, healthRegistry } from './health'
import { auditRoutes, auditRegistry } from './audit'
import { deploymentRoutes, deploymentRegistry } from './deployment'
import { metricsRoutes, metricsRegistry } from './metrics'
import projectsRouter from './projects'

const router: ExpressRouter = Router()

// Mount sub-routes
router.use('/health-checks', healthRoutes)
router.use('/audits', auditRoutes)
router.use('/deployments', deploymentRoutes)
router.use('/metrics', metricsRoutes)
router.use('/projects', projectsRouter)

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
      docs: '/api/docs',
    },
  })
})

export const routes = router
export const registries = [healthRegistry, auditRegistry, deploymentRegistry, metricsRegistry]
