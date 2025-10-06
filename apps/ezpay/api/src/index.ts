import { createApp, connectToMongo, startServer, getApiPort } from '@ezstart/express-core'
import routes from './routes/index.js'

const PORT = getApiPort(5040)

// Create app with raw body routes for webhook signature verification
const app = createApp({
  rawBodyRoutes: ['/api/webhooks/stripe'],
})

// Mount API routes
app.use('/api', routes)

// Start server
connectToMongo('ezpay')
  .then(() =>
    startServer(app, {
      routes,
      serviceName: 'EZPay',
      port: PORT,
    })
  )
  .catch(err => {
    console.error('❌ Failed to start EZPay API', err)
    process.exit(1)
  })
