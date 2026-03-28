import {
  createApp,
  connectToMongo,
  startServer,
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core'

const PORT = process.env.PORT || {{API_PORT}}
const app = createApp()

// OpenAPI setup
const registry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(registry, router)

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: '{{APP_NAME}}' }))

// Sample route
router.get('/', (_, res) => {
  res.json({ message: 'Welcome to {{APP_NAME}} API' })
})

// Mount routes
app.use('/api', docRouter)

// Start server
connectToMongo('{{APP_NAME}}')
  .then(() =>
    startServer(app, {
      routes: router,
      registries: [registry],
      serviceName: '{{DISPLAY_NAME}} API',
      port: Number(PORT),
    })
  )
  .catch((err) => {
    console.error('Failed to start API:', err)
    process.exit(1)
  })
