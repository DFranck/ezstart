// CRITICAL: load root env BEFORE any other import so that
// process.env.JWT_SECRET / MONGO_URL / SENTRY_DSN are populated before
// Sentry init and before any module that checks them at import time.
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl, getSentryDsn } from '@ezstart/config/env-resolvers'

loadSharedEnv({ app: 'gacha-analyzer', layer: 'api' })

process.env.MONGO_URL = getMongoUrl('gacha-analyzer')
const dsn = getSentryDsn('gacha-analyzer')
if (dsn) process.env.SENTRY_DSN = dsn

// eslint-disable-next-line import/first -- must run after env is populated
import { initSentry, Sentry } from '@ezstart/logger/server'

// Initialize Sentry for Gacha Analyzer API
const sentry = initSentry('Gacha Analyzer API')

export { Sentry, sentry }
