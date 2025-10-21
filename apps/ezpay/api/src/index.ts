// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import { connectToMongo, createApp, getApiPort, startServer } from '@ezstart/express-core'
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import routes, { registries } from './routes/index.js'

const PORT = getApiPort('ezpay')

// Create app with raw body routes for webhook signature verification
const app = createApp({
  rawBodyRoutes: ['/api/webhooks/stripe'],
  apiApp: 'ezpay',
})

// Health check (for Render)
app.get('/', (_, res) => res.status(200).json({ status: 'ok', service: 'EZPay' }))
app.get('/health', (_, res) => res.status(200).json({ status: 'ok', service: 'EZPay' }))

// Mount API routes
app.use('/api', routes)

// Sentry error handler (called automatically by expressIntegration)
// MUST be AFTER all routes/controllers
Sentry.setupExpressErrorHandler(app)

// Start server
connectToMongo('ezpay')
  .then(() =>
    startServer(app, {
      routes,
      registries,
      serviceName: 'EZPay',
      port: PORT,
    })
  )
  .catch(err => {
    console.error('❌ Failed to start EZPay API', err)
    process.exit(1)
  })
