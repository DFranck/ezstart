// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { connectToMongo, createApp, startServer, Router, getApiPort } from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'

export const app = createApp({ apiApp: 'green-pulse' })
const PORT = getApiPort('green-pulse')

app.use('/api', routes)

// Sentry error handler MUST be AFTER all routes
Sentry.setupExpressErrorHandler(app)

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