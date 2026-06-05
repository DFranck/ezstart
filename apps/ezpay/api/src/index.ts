// Updated: 2025-11-15 - App-specific roles support
// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  assertCriticalDeps,
  bootApi,
  createMongoosePingCheck,
  createResendCheck,
  createStripeBalanceCheck,
  createVersionedRouter,
  type HealthCheck,
} from '@ezstart/api-core'
import mongoose from 'mongoose'
import Stripe from 'stripe'
import { ensureWebhookEventIndexes } from './models/WebhookEvent.js'
import routes, { registries } from './routes/index.js'
import { startConnectCleanupScheduler } from './services/connect-cleanup.js'
import { startPayDocsDemoResetScheduler } from './services/pay-docs-demo-reset.service.js'

// 🔒 Boot-time critical-deps gate (hacker-A8 V3). In production any missing
// env var here would silently skip the matching /health/deep probe and
// cause a false-positive "All systems operational" — Stripe + Resend are
// both critical for the payment + transactional email flows, and
// EZPAY_SERVER_EZAUTH_KEY gates the cross-service POST /api/keys
// validation against ezauth. Throws in prod, warns in dev.
assertCriticalDeps({
  app: 'ezpay',
  required: [
    'MONGO_URL',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'RESEND_API_KEY',
    'EZPAY_SERVER_EZAUTH_KEY',
  ],
  logger,
})

// Deep-health checks executed by GET /health/deep. Stripe and Resend are
// gated on their respective env vars so the readiness probe never reports
// `down` on a dependency that's intentionally unconfigured (e.g. local dev
// without external credentials). See `.claude/rules/standard-saas-observability.md`
// §4.
const deepHealthChecks: HealthCheck[] = [createMongoosePingCheck(mongoose)]
if (process.env.STRIPE_SECRET_KEY) {
  // Stripe instance is dedicated to the health probe — short timeout, no
  // network retries beyond what the SDK does by default.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  deepHealthChecks.push(createStripeBalanceCheck(stripe))
}
if (process.env.RESEND_API_KEY) {
  deepHealthChecks.push(createResendCheck(process.env.RESEND_API_KEY))
}

// EZPay is a pure Bearer/publishable-key API — it consumes EZAuth JWTs but
// never sets its own cookies. Tier 1/2 permissive CORS (ACAO: *) applies to
// every endpoint. See .claude/rules/standard-saas-cors.md.
//
// `useDerivedMode: true` enables the Stripe-pattern test/live partition —
// `attachDerivedMode` parses the API key prefix on every request and
// `withRequestContextMiddleware` propagates the resolved mode through the
// AsyncLocalStorage frame consumed by `testModeScopePlugin`.
let app: import('@ezstart/api-core').Express
try {
  ;({ app } = await bootApi('ezpay', {
    mongoDbName: 'ezpay',
    rawBodyRoutes: ['/api/webhooks/stripe', '/api/webhooks/stripe-connect'],
    cookieAuthRoutes: [],
    deepHealthChecks,
    useDerivedMode: true,
    onReady: async ({ app }) => {
      // 🔒 Build the WebhookEvent unique `eventId` index BEFORE accepting
      // traffic. `bootApi` runs `onReady` after `connectToMongo` resolves and
      // before `startServer` binds the listener, so this guarantees the index
      // exists before the first webhook can be claimed. Without it, Mongoose's
      // lazy/async index build races the first deliveries → two inserts of the
      // same `event.id` both succeed → double-credit (hacker MED-1).
      await ensureWebhookEventIndexes()

      // Routes available at /api/* and /api/v1/*
      app.use(createVersionedRouter('/api', routes))
    },
    serverConfig: {
      routes,
      registries,
      serviceName: 'EZPay',
    },
  }))
} catch (err) {
  logger.error('Failed to start EZPay API', err)
  process.exit(1)
}

// Background job — auto-clean pending Connect rows > 7d + send J-6
// expiry warning emails. Cf. `services/connect-cleanup.ts` for the
// 6d/7d two-step lifecycle. Skipped under NODE_ENV=test so unit tests
// don't race the scheduler.
if (process.env.NODE_ENV !== 'test') {
  startConnectCleanupScheduler()
  // Pay docs sandbox reset cron (PAY_DOCS_DEMO_SANDBOX-001) — first tick
  // lands at the next 4am UTC, then every 24h. Wipes & re-seeds the
  // `_pay-docs-demo` payments / subscriptions / donations / invoices
  // baseline (plans persist across resets). Skipped under NODE_ENV=test.
  startPayDocsDemoResetScheduler()
}

export { app }
