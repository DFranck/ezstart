import { connectToMongo, createApp, createSocketServer, startServer } from '@ezstart/api-core'
import routes, { globalRegistry } from './routes'
import { setIO } from './socketInstance'
import { registerSocketHandlers } from './sockets/registerSocketHandlers'
const app = createApp()

app.use('/api', routes)
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }))

connectToMongo('tower-defense')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      serviceName: 'TowerDefense',
      port: 8002,
      onHttpServerReady: server => {
        const io = createSocketServer(server, {
          onConnection: socket => {
            registerSocketHandlers(socket)
          },
        })
        setIO(io)
      },
    })
  )
  .catch(err => {
    console.error('❌ Failed to start EzStart API', err)
    process.exit(1)
  })
