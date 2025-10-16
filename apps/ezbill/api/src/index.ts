import { connectToMongo, createApp, getApiPort, startServer } from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'

export const app = createApp({ apiApp: 'ezbill' })
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
