// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { connectToMongo, createApp, getApiPort, startServer } from '@ezstart/express-core'
import authRoutes, { authRegistry } from './routes/auth.routes.js'
import oauthRoutes from './routes/oauth.routes.js'
import waitlistRoutes, { waitlistRegistry } from './routes/waitlist.js'
import passport from './config/passport.js'
import { getAuthUserModel } from './models/auth-user.js'
import { getAuthCodeModel } from './models/auth-code.js'
import { getOAuthAccountModel } from './models/oauth-account.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { createCorsConfig } from '@ezstart/config/cors'

const PORT = getApiPort('ezauth')

// Create app with CORS configuration from @ezstart/config
const app = createApp({ apiApp: 'ezauth' })

// ✅ Override CORS to enable credentials (required for httpOnly cookies)
app.use(cors({
  ...createCorsConfig('ezauth'),
  credentials: true  // CRITICAL for httpOnly cookies
}))

// ✅ Add cookie parser middleware (for httpOnly cookie support)
app.use(cookieParser())

// Initialize Passport
app.use(passport.initialize())

// Health check (for Render)
app.get('/', (_: any, res: any) => res.status(200).json({ status: 'ok', service: 'EZAuth' }))
app.get('/health', (_: any, res: any) => res.status(200).json({ status: 'ok', service: 'EZAuth' }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/auth', oauthRoutes) // OAuth routes (Google, GitHub)
app.use('/api/waitlist', waitlistRoutes)
app.get('/api/health', (_: any, res: any) => res.status(200).json({ status: 'ok' }))

// Sentry error handler (called automatically by expressIntegration)
// MUST be AFTER all routes/controllers
Sentry.setupExpressErrorHandler(app)

// Connect to MongoDB and start server
connectToMongo('ezauth')
  .then(async () => {
    // Initialize models
    await getAuthUserModel()
    await getAuthCodeModel()
    await getOAuthAccountModel()
    console.log('✅ Models initialized (AuthUser, AuthCode, OAuthAccount)')

    return startServer(app, {
      routes: authRoutes,
      registries: [authRegistry, waitlistRegistry],
      serviceName: 'EZAuth',
      port: Number(PORT),
    })
  })
  .catch((err: any) => {
    console.error('❌ Failed to start EZAuth API', err)
    process.exit(1)
  })
