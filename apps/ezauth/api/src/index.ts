// TEMP DIAG: Sentry import disabled to isolate the staging CORS 500 bug.
// `@sentry/node` v10 auto-loads OpenTelemetry HTTP instrumentation as a
// side effect of importing this module — even when `Sentry.init` is called
// with `integrations: []` and `defaultIntegrations: false`. When OTEL's
// HTTP wrapper is active on Railway's managed Node runtime, every request
// carrying a non-empty `Origin` header is rejected with HTTP 500 before
// Express's first middleware sees it (verified via `[pre-cors-diag]` log:
// fires for `origin=(none)` requests, never for origin-bearing ones).
//
// Re-enable Sentry once the OTEL HTTP integration interaction with `cors`
// / Railway is understood (or once we move to a Sentry version that lets
// us opt out of the HTTP wrap cleanly).
//
// Original lines (kept for restore):
//   import './instrument.mjs'
//   import { Sentry } from './instrument.mjs'
//
// Stub Sentry export so `Sentry.setupExpressErrorHandler(app)` below
// remains a no-op without code changes downstream.
const Sentry = {
  setupExpressErrorHandler: (_app: unknown) => {
    // intentionally no-op while Sentry is disabled
  },
} as const
import {
  addVersionHeader,
  connectToMongo,
  createEzstartServer,
  createVersionedRouter,
  startServer,
} from '@ezstart/api-core'
import { getAllowedOrigins } from '@ezstart/config/cors'
import routes, {
  allRegistries,
  authRouter,
  oauthRouter,
  adminRouter,
  apiKeysRouter,
  applicationsRouter,
  subscriptionsRouter,
} from './routes/index.js'
import passport from './config/passport.js'
import { getAuthUserModel } from './models/auth-user.js'
import { getAuthCodeModel } from './models/auth-code.js'
import { getOAuthAccountModel } from './models/oauth-account.js'
import { getTotpSecretModel } from './models/totp-secret.js'
import { getApiKeyModel } from './models/api-key.js'
import { getApplicationModel } from './models/application.js'
import { getSubscriptionEventModel } from './models/subscription-event.js'
import cookieParser from 'cookie-parser'
import { logger } from '@ezstart/logger/server'

// 3-tier CORS policy (see .claude/rules/standard-saas-cors.md):
// - Tier 1/2 (public, publishable-key, Bearer): `Access-Control-Allow-Origin: *`
//   applied globally by createEzstartServer.
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

const server = createEzstartServer('ezauth', {
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

// Routes
// /api/auth/*  — credentials + OAuth
// /api/admin/* — authorization / user admin
app.use(createVersionedRouter('/api/auth', authRouter))
app.use(createVersionedRouter('/api/auth', oauthRouter))
app.use(createVersionedRouter('/api/admin', adminRouter))
app.use(createVersionedRouter('/api', apiKeysRouter))
app.use(createVersionedRouter('/api', applicationsRouter))
app.use(createVersionedRouter('/api', subscriptionsRouter))

// Sentry error handler MUST be AFTER all routes/controllers
Sentry.setupExpressErrorHandler(app)

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
    logger.info(
      '[Models] Initialized: AuthUser, AuthCode, OAuthAccount, TotpSecret, ApiKey, Application, SubscriptionEvent'
    )

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
