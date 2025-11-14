// Updated: 2025-11-15 - App-specific roles support
// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import {
  connectToMongo,
  createApp,
  createRateLimiter,
  createSocketServer,
  startServer,
  getApiPort,
  createVersionedRouter,
  addVersionHeader
} from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'
import { setIO } from './socketInstance.js'
import { registerSocketHandlers } from './sockets/registerSocketHandlers.js'
import { seedEntityTypes } from './services/entityRegistry.js'

const app = createApp({ apiApp: 'tower-defense' })
const PORT = getApiPort('tower-defense')

// ✅ Rate limiting protection (100 req/15min per IP, excludes /api/health)
app.use(createRateLimiter())

// ✅ Add API version headers to all responses
app.use(addVersionHeader('v1'))

// ✅ API routes with versioning support (supports both /api and /api/v1)
app.use(createVersionedRouter('/api', routes))

// Sentry error handler MUST be AFTER all routes
Sentry.setupExpressErrorHandler(app)

connectToMongo('towerdefense')
  .then(async () => {
    // Seed entity types (MobType/TowerType registry)
    await seedEntityTypes()

    return startServer(app, {
      routes,
      registries: globalRegistry,
      serviceName: 'TowerDefense',
      port: Number(PORT),
      onHttpServerReady: server => {
        const io = createSocketServer(server, {
          onConnection: socket => {
            registerSocketHandlers(socket)
          },
        })
        setIO(io)
      },
    })
  })
  .catch(err => {
    console.error('❌ Failed to start Tower Defense API', err)
    process.exit(1)
  })
