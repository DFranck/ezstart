import { createApp, startServer, connectToMongo, getApiPort, createSocketServer } from '@ezstart/express-core'
import { getAllowedOrigins } from '@ezstart/config/cors'
import { routes, registries } from './routes/index.js'
import { HealthCheckScheduler } from './services/healthCheckScheduler.js'
import type { Server as IOServer } from 'socket.io'

const PORT = getApiPort('monitoring')

// Create Express app with CORS auto-configured
// Monitoring API is called by ALL web apps (dashboard in EZStart)
const app = createApp({ apiApp: 'monitoring' })

// Get CORS origins for Socket.IO (all web apps can connect)
const socketCorsOrigins = getAllowedOrigins('monitoring')

// Store Socket.IO instance to be used by scheduler
let io: IOServer

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

// Connect to MongoDB and start server
// Wait for MongoDB to be fully ready before starting scheduler
connectToMongo('ezstart-monitoring')
  .then(() => {
    return startServer(app, {
      routes,
      registries,
      serviceName: 'Monitoring API',
      port: PORT,
      onHttpServerReady: (httpServer) => {
        // Create Socket.IO server with CORS matching Express CORS
        io = createSocketServer(httpServer, {
          corsOrigins: socketCorsOrigins,
          onConnection: (socket) => {
            console.log(`📡 [Socket.IO] Client connected from monitoring dashboard`)

            socket.on('disconnect', () => {
              console.log(`📡 [Socket.IO] Client disconnected`)
            })
          }
        })

        // Pass Socket.IO instance to scheduler for real-time updates
        healthCheckScheduler.setSocketIO(io)
      }
    })
  })
  .then(() => {
    console.log('✅ Server started, MongoDB fully operational')
    // Start background health check scheduler ONLY after MongoDB is ready
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
