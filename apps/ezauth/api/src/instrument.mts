// CRITICAL: load root env BEFORE any other import so that
// process.env.JWT_SECRET / MONGO_URL / SENTRY_DSN are populated before
// Sentry init and before any module that checks them at import time
// (e.g. packages/express-core/.../middleware/auth.ts).
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl, getSentryDsn } from '@ezstart/config/env-resolvers'

loadSharedEnv({ app: 'ezauth', layer: 'api' })

// Resolve per-app values from generic root vars and export them under the
// runtime names the rest of the codebase (and Sentry) expects.
process.env.MONGO_URL = getMongoUrl('ezauth')
const dsn = getSentryDsn('ezauth')
if (dsn) process.env.SENTRY_DSN = dsn

// eslint-disable-next-line import/first -- must run after env is populated
import { initSentry, Sentry } from '@ezstart/logger/server'

// Initialize Sentry for EZAuth API
const sentry = initSentry('EZAuth API')

export { Sentry, sentry }
