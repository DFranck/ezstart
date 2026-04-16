// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import {
  addVersionHeader,
  connectToMongo,
  createEzstartServer,
  createVersionedRouter,
  startServer,
} from '@ezstart/api-core'
import routes, { allRegistries, authRouter, oauthRouter, adminRouter } from './routes/index.js'
import passport from './config/passport.js'
import { getAuthUserModel } from './models/auth-user.js'
import { getAuthCodeModel } from './models/auth-code.js'
import { getOAuthAccountModel } from './models/oauth-account.js'
import { getTotpSecretModel } from './models/totp-secret.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { createCorsConfig } from '@ezstart/config/cors'
import { logger } from '@ezstart/logger/server'

const server = createEzstartServer('ezauth')
const { app } = server

// Override CORS to enable credentials (required for httpOnly cookies).
// createEzstartServer already applies a CORS middleware, but EZAuth needs
// `credentials: true` for cookie auth. Order: this one wins for
// pre-flight responses since Express matches middlewares in registration
// order — re-registering narrows the policy deterministically.
app.use(
  cors({
    ...createCorsConfig('ezauth'),
    credentials: true,
  })
)

// Cookie parser middleware (required for httpOnly cookie support)
app.use(cookieParser())

// Passport init (OAuth strategies registered elsewhere)
app.use(passport.initialize())

// API version headers on every response
app.use(addVersionHeader('v1'))

// Routes
// /api/auth/*  — credentials + OAuth
// /api/admin/* — authorization / user admin
app.use(createVersionedRouter('/api/auth', authRouter))
app.use(createVersionedRouter('/api/auth', oauthRouter))
app.use(createVersionedRouter('/api/admin', adminRouter))

// Sentry error handler MUST be AFTER all routes/controllers
Sentry.setupExpressErrorHandler(app)

// Connect to MongoDB, warm models, then start listening
connectToMongo('ezauth')
  .then(async () => {
    await getAuthUserModel()
    await getAuthCodeModel()
    await getOAuthAccountModel()
    await getTotpSecretModel()
    logger.info('[Models] Initialized: AuthUser, AuthCode, OAuthAccount, TotpSecret')

    return startServer(app, {
      routes,
      registries: allRegistries,
      serviceName: 'EZAuth',
      port: server.config.port,
      logger: server.logger,
    })
  })
  .catch((err: unknown) => {
    logger.error('Failed to start EZAuth API', err)
    process.exit(1)
  })

export { app }
