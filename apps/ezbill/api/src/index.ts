// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { connectToMongo, createApp, getApiPort, startServer } from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'

export const app = createApp({ apiApp: 'ezbill' })
const PORT = getApiPort('ezbill')

app.use('/api', routes)

// Sentry error handler MUST be AFTER all routes
Sentry.setupExpressErrorHandler(app)

connectToMongo('ezbill')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'EZBill',
      port: Number(PORT),
    })
  )
  .catch(err => {
    console.error('❌ Failed to start EZBill API', err)
    process.exit(1)
  })
