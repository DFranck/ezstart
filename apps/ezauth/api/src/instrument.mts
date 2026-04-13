// CRITICAL: load root-only prefixed env BEFORE any other import so that
// process.env.SENTRY_DSN / JWT_SECRET / MONGO_URL are populated before
// Sentry init and before any module that checks them at import time
// (e.g. packages/express-core/.../middleware/auth.ts).
import { loadSharedEnv } from '@ezstart/config/server'
loadSharedEnv({ app: 'ezauth', layer: 'api' })

import { initSentry, Sentry } from '@ezstart/logger/server'

// Initialize Sentry for EZAuth API
const sentry = initSentry('EZAuth API')

export { Sentry, sentry }
