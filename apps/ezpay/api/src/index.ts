import { createApp, connectToMongo, startServer, getApiPort } from '@ezstart/express-core'
import routes from './routes/index.js'

const PORT = getApiPort(5040)

// Create app with raw body routes for webhook signature verification
const app = createApp({
  rawBodyRoutes: ['/api/webhooks/stripe'],
  corsOrigins: [
    'http://localhost:5065', // FengShui local
    'http://localhost:5045', // EZPay web local
    'https://ez-fengshui.vercel.app', // FengShui prod
    'https://ezpay.vercel.app', // EZPay web prod (if needed)
  ],
})

// Health check (for Render)
app.get('/', (_, res) => res.status(200).json({ status: 'ok', service: 'EZPay' }))
app.get('/health', (_, res) => res.status(200).json({ status: 'ok', service: 'EZPay' }))

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
