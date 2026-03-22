// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import {
  connectToMongo,
  createApp,
  createRateLimiter,
  startServer,
  Router,
  getApiPort,
  createVersionedRouter,
  addVersionHeader
} from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'

export const app = createApp({ apiApp: 'game-analyzer' })
const PORT = getApiPort('game-analyzer')

// Rate limiting protection (100 req/15min per IP, excludes /api/health)
app.use(createRateLimiter())

// Add API version headers to all responses
app.use(addVersionHeader('v1'))

// API routes with versioning support (supports both /api and /api/v1)
app.use(createVersionedRouter('/api', routes))

// Sentry error handler MUST be AFTER all routes
Sentry.setupExpressErrorHandler(app)

// Start server with MongoDB
connectToMongo('game-analyzer')
  .then(async () => {
    return startServer(app, {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'GameAnalyzer',
      port: PORT,
    })
  })
  .catch(err => {
    console.error('Failed to start Game Analyzer API', err)
    process.exit(1)
  })
