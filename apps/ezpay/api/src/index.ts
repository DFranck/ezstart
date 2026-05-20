// Updated: 2025-11-15 - App-specific roles support
// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import { bootApi, createVersionedRouter } from '@ezstart/api-core'
import { ensureWebhookEventIndexes } from './models/WebhookEvent.js'
import routes, { registries } from './routes/index.js'
import { startConnectCleanupScheduler } from './services/connect-cleanup.js'
import { startPayDocsDemoResetScheduler } from './services/pay-docs-demo-reset.service.js'

// Fail-fast in production if the S2S key for ezauth cross-service validation
// is missing — without it `POST /api/keys` can't validate Applications against
// ezauth and Phase G seed flows silently 404. In dev/staging a warn is enough.
if (process.env.NODE_ENV === 'production' && !process.env.EZPAY_SERVER_EZAUTH_KEY) {
  logger.error('EZPAY_SERVER_EZAUTH_KEY is required in production. Aborting boot.')
  process.exit(1)
} else if (!process.env.EZPAY_SERVER_EZAUTH_KEY) {
  logger.warn(
    'EZPAY_SERVER_EZAUTH_KEY not set — cross-service Application validation will fail on POST /api/keys'
  )
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
