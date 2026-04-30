// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import {
  addVersionHeader,
  attachDerivedMode,
  connectToMongo,
  createApiServer,
  createVersionedRouter,
  initSentry,
  startServer,
  withRequestContextMiddleware,
} from '@ezstart/api-core'

// Initialize Sentry BEFORE createApiServer so the error-handler middleware
// can safely capture exceptions. No-op when SENTRY_DSN is unset (caller can
// always invoke this regardless of env config). Uses `@sentry/node-core` with
// ZERO auto-integrations to avoid the 2026-04-25 OTEL/CORS incident on Railway.
initSentry({ serviceName: 'ezauth' })
import { getAllowedOrigins } from '@ezstart/config/cors'
import routes, {
  allRegistries,
  authRouter,
  oauthRouter,
  adminRouter,
  apiKeysRouter,
  applicationsRouter,
  subscriptionsRouter,
  publicRouter,
} from './routes/index.js'
import passport from './config/passport.js'
import { getAuthUserModel } from './models/auth-user.js'
import { getAuthCodeModel } from './models/auth-code.js'
import { getOAuthAccountModel } from './models/oauth-account.js'
import { getTotpSecretModel } from './models/totp-secret.js'
import { getApiKeyModel } from './models/api-key.js'
import { getApplicationModel } from './models/application.js'
import { getSubscriptionEventModel } from './models/subscription-event.js'
import { getFeatureFlagModel } from './models/feature-flag.js'
import { getMaintenanceModeModel } from './models/maintenance-mode.js'
import { getErrorLogModel } from './models/error-log.js'
import { logErrorToDb } from './services/error-log.service.js'
import cookieParser from 'cookie-parser'
import { logger } from '@ezstart/logger/server'

// 3-tier CORS policy (see .claude/rules/standard-saas-cors.md):
// - Tier 1/2 (public, publishable-key, Bearer): `Access-Control-Allow-Origin: *`
//   applied globally by createApiServer.
// - Tier 3 (cookie-auth): strict allowlist with credentials: true, applied
//   only on the cookie-issuing prefixes below.
//
// Cookie-issuing files (grep `res.cookie(` / `res.clearCookie(`):
//   - routes/auth/login-cookie.ts  → /api/auth/login
//   - routes/auth/refresh.ts        → /api/auth/refresh
//   - routes/auth/logout.ts         → /api/auth/logout
//   - routes/auth/sso-exchange.ts   → /api/auth/sso-exchange
//   - routes/auth/token.ts          → /api/auth/token
//   - routes/oauth/google-*.ts      → /api/auth/oauth (state cookie)
const COOKIE_AUTH_ROUTES = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/sso-exchange',
  '/api/auth/token',
  '/api/auth/oauth',
]

// Allowlist = monorepo first-party web URLs (from @ezstart/config) + Vercel
// preview deploys. Additional external first-party domains can be added via
// the `cookieAuthAllowlist` option if needed.
const COOKIE_AUTH_ALLOWLIST = [
  ...getAllowedOrigins('ezauth'),
  // Vercel preview deploys (immutable build hash)
  /^https:\/\/ezauth-[a-z0-9]+-ezstart\.vercel\.app$/,
  // Vercel git branch deploys (e.g. `ezauth-git-staging-ezstart.vercel.app`)
  /^https:\/\/ezauth-git-[a-z0-9-]+-ezstart\.vercel\.app$/,
]

const server = createApiServer('ezauth', {
  cookieAuthRoutes: COOKIE_AUTH_ROUTES,
  cookieAuthAllowlist: COOKIE_AUTH_ALLOWLIST,
})
const { app } = server

// Cookie parser middleware (required for httpOnly cookie support)
app.use(cookieParser())

// Passport init (OAuth strategies registered elsewhere)
app.use(passport.initialize())

// API version headers on every response
app.use(addVersionHeader('v1'))

// Stripe-pattern test/live mode partition (`standard-saas-data.md` §4):
// 1. `attachDerivedMode` parses the API key prefix on the request and stamps
//    `req.derivedMode` ('test' | 'live'). Defaults to 'live' for cookie-auth
//    dashboard requests; superadmin can override via `?mode=` query param.
// 2. `withRequestContextMiddleware` wraps the rest of the request lifecycle
//    in an AsyncLocalStorage frame so the per-app `testModeScopePlugin`
//    Mongoose hook can read the mode without an explicit `req` reference.
//
// Placement matters: AFTER auth/api-key middleware (which sets `req.user` and
// `req.apiKeyEnv` if applicable), BEFORE routes. Routes themselves don't need
// to mount auth at the app level — most ezauth routes use per-route auth
// guards. The mode resolution still works because both attachDerivedMode and
// the per-route auth read from the same headers/cookies.
app.use(attachDerivedMode)
app.use(withRequestContextMiddleware)

// Routes
// /api/auth/*  — credentials + OAuth
// /api/admin/* — authorization / user admin
app.use(createVersionedRouter('/api/auth', authRouter))
app.use(createVersionedRouter('/api/auth', oauthRouter))
app.use(createVersionedRouter('/api/admin', adminRouter))
app.use(createVersionedRouter('/api', apiKeysRouter))
app.use(createVersionedRouter('/api', applicationsRouter))
app.use(createVersionedRouter('/api', subscriptionsRouter))
app.use(createVersionedRouter('/api', publicRouter))

// Connect to MongoDB, warm models, then start listening
connectToMongo('ezauth')
  .then(async () => {
    await getAuthUserModel()
    await getAuthCodeModel()
    await getOAuthAccountModel()
    await getTotpSecretModel()
    await getApiKeyModel()
    await getApplicationModel()
    await getSubscriptionEventModel()
    await getFeatureFlagModel()
    await getMaintenanceModeModel()
    await getErrorLogModel()
    logger.info(
      '[Models] Initialized: AuthUser, AuthCode, OAuthAccount, TotpSecret, ApiKey, Application, SubscriptionEvent, FeatureFlag, MaintenanceMode, ErrorLog'
    )

    return startServer(app, {
      routes,
      registries: allRegistries,
      serviceName: 'EZAuth',
      port: server.config.port,
      logger: server.logger,
      // Sentry-free stopgap — persist every unhandled error to the local
      // `error_logs` collection so the admin dashboard can browse them.
      // Fire-and-forget; the service is defensive and never throws.
      persistError: (err, req) => logErrorToDb({ err, req }),
    })
  })
  .catch((err: unknown) => {
    logger.error('Failed to start EZAuth API', err)
    process.exit(1)
  })

export { app }
