// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { connectToMongo, createApp, createSocketServer, startServer, getApiPort } from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'
import { setIO } from './socketInstance.js'
import { registerSocketHandlers } from './sockets/registerSocketHandlers.js'
import { seedEntityTypes } from './services/entityRegistry.js'

const app = createApp({ apiApp: 'tower-defense' })
const PORT = getApiPort('tower-defense')

app.use('/api', routes)

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
