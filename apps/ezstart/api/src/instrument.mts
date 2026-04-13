// CRITICAL: load root-only prefixed env BEFORE any other import so that
// process.env.SENTRY_DSN / JWT_SECRET / MONGO_URL are populated before
// Sentry init and before any module that checks them at import time.
import { loadSharedEnv } from '@ezstart/config/server'
loadSharedEnv({ app: 'ezstart', layer: 'api' })

import { initSentry, Sentry } from '@ezstart/logger/server'

// Initialize Sentry for Monitoring API
const sentry = initSentry('Monitoring API')

export { Sentry, sentry }
