import { connectToMongo, createApp, getApiPort, startServer } from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'

export const app = createApp({
  corsOrigins: [
    // Local development
    'http://localhost:5025', // EZBill web local
    // Vercel domains (legacy)
    'https://ezstart-ezbill.vercel.app',
    // Custom domains (ezstart.xyz)
    'https://ezbill.ezstart.xyz',
  ],
})
const PORT = getApiPort()

// Health check (for Render)
app.get('/', (_, res) => res.status(200).json({ status: 'ok', service: 'EZBill' }))
app.get('/health', (_, res) => res.status(200).json({ status: 'ok', service: 'EZBill' }))

app.use('/api', routes)
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }))

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
