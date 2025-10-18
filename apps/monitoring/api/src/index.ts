import { createApp, startServer, connectToMongo, getApiPort } from '@ezstart/express-core'
import { getAllWebUrls } from '@ezstart/config'
import { routes, registries } from './routes/index.js'
import { HealthCheckScheduler } from './services/healthCheckScheduler.js'

const PORT = getApiPort('monitoring')

// Create Express app with CORS for all web apps
// Allow all EZStart web apps to call the monitoring API
const corsOrigins = [
  ...getAllWebUrls('ezstart'),
  ...getAllWebUrls('ezauth'),
  ...getAllWebUrls('ezbill'),
  ...getAllWebUrls('ezpay'),
  ...getAllWebUrls('tower-defense'),
  ...getAllWebUrls('fengshui'),
  ...getAllWebUrls('asc-tcd'),
  ...getAllWebUrls('green-pulse'),
]
const app = createApp({ corsOrigins })

// Initialize health check scheduler
const healthCheckScheduler = new HealthCheckScheduler()

// Health check endpoint
app.get('/api/health', (_, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'monitoring-api',
    timestamp: new Date().toISOString(),
    scheduler: healthCheckScheduler.getStatus(),
  })
})

// Mount API routes
app.use('/api', routes)

// Connect to MongoDB and start server with OpenAPI documentation
connectToMongo('ezstart-monitoring')
  .then(() => {
    console.log('✅ Connected to MongoDB (ezstart-monitoring)')
    return startServer(app, {
      routes,
      registries,
      serviceName: 'Monitoring API',
      port: PORT,
    })
  })
  .then(() => {
    // Start background health check scheduler
    healthCheckScheduler.start()
  })
  .catch(err => {
    console.error('❌ Failed to start Monitoring API', err)
    process.exit(1)
  })

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⏰ [Scheduler] SIGTERM received, stopping scheduler...')
  healthCheckScheduler.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('⏰ [Scheduler] SIGINT received, stopping scheduler...')
  healthCheckScheduler.stop()
  process.exit(0)
})
