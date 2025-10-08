import { connectToMongo, createApp, startServer, Router, getApiPort } from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'

export const app = createApp()
const PORT = getApiPort(5070)

app.use('/api', routes)
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok', service: 'green-pulse-api' }))

// Start server with MongoDB
connectToMongo('greenpulse')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'GreenPulse',
      port: PORT,
    })
  )
  .catch(err => {
    console.error('❌ Failed to start GreenPulse API', err)
    process.exit(1)
  })