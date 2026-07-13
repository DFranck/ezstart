// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import {
  assertCriticalDeps,
  bootApi,
  createMongoosePingCheck,
  createResendCheck,
  createVersionedRouter,
  initSentry,
  type HealthCheck,
} from '@ezstart/api-core'
import mongoose from 'mongoose'

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
  internalRouter,
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
import { startDocsDemoResetScheduler } from './services/docs-demo-reset.service.js'
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

// 🔒 Boot-time critical-deps gate (hacker-A8 V3). In production a missing
// env var here would silently skip the matching /health/deep probe and
// cause a false-positive "All systems operational" — RESEND_API_KEY in
// particular is critical for password-reset / email-verify flows. Throws
// in prod, warns in dev. See `.claude/rules/standard-saas-observability.md`
// §4.
assertCriticalDeps({
  app: 'ezauth',
  required: ['MONGO_URL', 'JWT_SECRET', 'RESEND_API_KEY'],
  logger,
})

// Deep-health checks executed by GET /health/deep. Each dependency is
// conditional on the corresponding env var — the boot-time gate above
// guarantees the production-critical ones are present, while still
// allowing a local dev API to boot without Resend (the gate downgrades
// to a warn in non-prod).
const deepHealthChecks: HealthCheck[] = [createMongoosePingCheck(mongoose)]
if (process.env.RESEND_API_KEY) {
  deepHealthChecks.push(createResendCheck(process.env.RESEND_API_KEY))
}

// `useDerivedMode: true` enables the Stripe-pattern test/live partition for
// the API-key endpoints (`/api/keys/*`, `/api/applications/*`, etc.). Cookie-
// auth dashboard requests fall back to `'live'` by default — superadmin can
// override via `?mode=` query param. See `.claude/rules/standard-saas-data.md`
// §4 for the full contract.
let app: import('@ezstart/api-core').Express
try {
  ;({ app } = await bootApi('ezauth', {
    mongoDbName: 'ezauth',
    cookieAuthRoutes: COOKIE_AUTH_ROUTES,
    cookieAuthAllowlist: COOKIE_AUTH_ALLOWLIST,
    deepHealthChecks,
    // Raw body capture for the cross-service subscription webhook receiver.
    // The HMAC signature from EZPay is computed over the EXACT bytes sent on
    // the wire — re-serializing via `JSON.stringify(req.body)` is a future
    // engine upgrade time-bomb (Bun/Deno/V8 spec drift could change key
    // ordering and silently break every webhook). Both the unversioned and
    // `/v1/` mount points must be listed because `createVersionedRouter`
    // exposes the router at `/api/subscriptions/webhook` AND
    // `/api/v1/subscriptions/webhook`.
    rawBodyRoutes: ['/api/subscriptions/webhook', '/api/v1/subscriptions/webhook'],
    useDerivedMode: true,
    onReady: async ({ app }) => {
      // Cookie parser + Passport must be mounted on the app BEFORE the routes
      // that read cookies (login/refresh/logout) and BEFORE the OAuth routes
      // that call `passport.authenticate(...)`. Mounted in `onReady` so they
      // sit between the api-core stack and the route handlers.
      app.use(cookieParser())
      app.use(passport.initialize())

      // Routes
      // /api/auth/*  — credentials + OAuth
      // /api/admin/* — authorization / user admin
      app.use(createVersionedRouter('/api/auth', authRouter))
      app.use(createVersionedRouter('/api/auth', oauthRouter))
      app.use(createVersionedRouter('/api/admin', adminRouter))
      app.use(createVersionedRouter('/api', apiKeysRouter))
      app.use(createVersionedRouter('/api', applicationsRouter))
      app.use(createVersionedRouter('/api', subscriptionsRouter))
      app.use(createVersionedRouter('/api/internal', internalRouter))
      app.use(createVersionedRouter('/api', publicRouter))

      // Warm Mongoose models so the first request does not pay the
      // schema-compilation cost. Awaited sequentially — Mongoose's model
      // registry is in-memory so the cost is negligible.
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

      // Start the docs-demo sandbox reset scheduler (DOCS_DEMO_SANDBOX_BACKEND-001).
      // Idempotent — safe to call once after models are warm. The scheduler
      // ticks every 24h (cf. `services/docs-demo-reset.service.ts`) and
      // wipes `_docs-demo` users + 24h-old audit logs. Skipped in test
      // env to avoid leaking timers across vitest workers.
      if (process.env.NODE_ENV !== 'test') {
        startDocsDemoResetScheduler()
      }
    },
    serverConfig: {
      routes,
      registries: allRegistries,
      serviceName: 'EZAuth',
      // Sentry-free stopgap — persist every unhandled error to the local
      // `error_logs` collection so the admin dashboard can browse them.
      // Fire-and-forget; the service is defensive and never throws.
      persistError: (err, req) => logErrorToDb({ err, req }),
    },
  }))
} catch (err) {
  logger.error('Failed to start EZAuth API', err)
  process.exit(1)
}

export { app }
