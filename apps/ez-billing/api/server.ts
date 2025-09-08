import { connectToMongo, createApp, startServer } from '@ezstart/api-core'
import routes, { globalRegistry } from './routes/index.js'

export const app = createApp()
const PORT = process.env.PORT || 3001
connectToMongo('ez-billing')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      serviceName: 'EzBilling',
      port: Number(PORT),
    })
  )
  .catch(err => {
    console.error('❌ Failed to start EzBilling API', err)
    process.exit(1)
  })
