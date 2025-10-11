import { connectToMongo, createApp, createSocketServer, startServer, getApiPort } from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'
import { setIO } from './socketInstance.js'
import { registerSocketHandlers } from './sockets/registerSocketHandlers.js'
import { seedEntityTypes } from './services/entityRegistry.js'

const app = createApp()
const PORT = getApiPort()

// Health check (for Render)
app.get('/', (_, res) => res.status(200).json({ status: 'ok', service: 'Tower Defense' }))
app.get('/health', (_, res) => res.status(200).json({ status: 'ok', service: 'Tower Defense' }))

app.use('/api', routes)
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }))

connectToMongo('tower-defense')
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
