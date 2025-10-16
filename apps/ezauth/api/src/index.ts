import { connectToMongo, createApp, getApiPort, startServer } from '@ezstart/express-core'
import authRoutes, { authRegistry } from './routes/auth.routes.js'
import waitlistRoutes, { waitlistRegistry } from './routes/waitlist.js'

const PORT = getApiPort()

// Create app with CORS configuration from @ezstart/config
const app = createApp({ apiApp: 'ezauth' })

// Health check (for Render)
app.get('/', (_: any, res: any) => res.status(200).json({ status: 'ok', service: 'EZAuth' }))
app.get('/health', (_: any, res: any) => res.status(200).json({ status: 'ok', service: 'EZAuth' }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/waitlist', waitlistRoutes)
app.get('/api/health', (_: any, res: any) => res.status(200).json({ status: 'ok' }))

// Start server with database connection
connectToMongo('ezauth')
  .then(() =>
    startServer(app, {
      routes: authRoutes,
      registries: [authRegistry, waitlistRegistry],
      serviceName: 'EZAuth',
      port: Number(PORT),
    })
  )
  .catch((err: any) => {
    console.error('❌ Failed to start EZAuth API', err)
    process.exit(1)
  })
