import { createApp, connectToMongo, startServer, getApiPort } from '@ezstart/express-core'
import authRoutes, { authRegistry } from './routes/auth.routes.js'

const PORT = getApiPort()

// Create app with standard configuration
const app = createApp()

// API routes
app.use('/api/auth', authRoutes)
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }))

// Start server with database connection
connectToMongo('ezauth')
  .then(() =>
    startServer(app, {
      routes: authRoutes,
      registries: [authRegistry],
      serviceName: 'EZAuth',
      port: Number(PORT),
    })
  )
  .catch(err => {
    console.error('❌ Failed to start EZAuth API', err)
    process.exit(1)
  })