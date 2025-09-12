import { connectToMongo, createApp, startServer, getApiPort } from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'

export const app = createApp()
const PORT = getApiPort()
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
