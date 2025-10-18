import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import {
  HealthChecker,
  MONITORED_SERVICES,
  AUDIT_METADATA,
  calculateOverallHealthScore,
  getOverallHealthStatus,
  type MonitoringMetrics,
} from '@ezstart/monitoring'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const metricsRegistry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(metricsRegistry, router)
export const metricsRoutes = router as ReturnType<typeof Router>

const healthChecker = new HealthChecker()

router.get('/', async (_, res) => {
  res.json({ message: 'Metrics endpoint - TODO: implement full metrics' })
})

router.get('/dashboard', async (_, res) => {
  res.redirect('/api/metrics')
})
