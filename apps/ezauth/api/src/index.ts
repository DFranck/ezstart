// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import {
  connectToMongo,
  createApp,
  createRateLimiter,
  createStrictRateLimiter,
  getApiPort,
  startServer,
  createVersionedRouter,
  addVersionHeader,
} from '@ezstart/express-core'
import routes, {
  allRegistries,
  authRouter,
  oauthRouter,
  waitlistRouter,
  adminRouter,
} from './routes/index.js'
import passport from './config/passport.js'
import { getAuthUserModel } from './models/auth-user.js'
import { getAuthCodeModel } from './models/auth-code.js'
import { getOAuthAccountModel } from './models/oauth-account.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { createCorsConfig } from '@ezstart/config/cors'
import { logger } from '@ezstart/logger/server'

const PORT = getApiPort('ezauth')

// Create app with CORS configuration from @ezstart/config
const app = createApp({ apiApp: 'ezauth' })

// ✅ Override CORS to enable credentials (required for httpOnly cookies)
app.use(
  cors({
    ...createCorsConfig('ezauth'),
    credentials: true, // CRITICAL for httpOnly cookies
  })
)

// ✅ Add cookie parser middleware (for httpOnly cookie support)
app.use(cookieParser())

// ✅ Global rate limiting (100 req/15min per IP, excludes /api/health)
// Per-route strict limiters are also applied on login endpoints (see routes/auth/)
app.use(createRateLimiter())

// Initialize Passport
app.use(passport.initialize())

// ✅ Add API version headers to all responses
app.use(addVersionHeader('v1'))

// ✅ API routes with versioning support
// /api/auth/* - All authentication (credentials + OAuth)
// /api/admin/* - All admin/authorization routes
// /api/waitlist/* - Waitlist routes
app.use(createVersionedRouter('/api/auth', authRouter)) // /api/auth/login, /api/auth/register, /api/auth/token, etc.
app.use(createVersionedRouter('/api/auth', oauthRouter)) // /api/auth/google, /api/auth/callback (OAuth)
app.use(createVersionedRouter('/api/admin', adminRouter)) // /api/admin/users
app.use(createVersionedRouter('/api/waitlist', waitlistRouter)) // /api/waitlist/:appName/add

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
    logger.info('✅ [Models] Initialized: AuthUser, AuthCode, OAuthAccount')

    return startServer(app, {
      routes,
      registries: allRegistries,
      serviceName: 'EZAuth',
      port: Number(PORT),
    })
  })
  .catch((err: any) => {
    logger.error('❌ Failed to start EZAuth API', err)
    process.exit(1)
  })
