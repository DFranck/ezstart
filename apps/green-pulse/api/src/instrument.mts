// CRITICAL: load root env BEFORE any other import so that
// process.env.JWT_SECRET / MONGO_URL are populated before any module that
// checks them at import time.
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'

loadSharedEnv({ app: 'green-pulse', layer: 'api' })

process.env.MONGO_URL = getMongoUrl('green-pulse')
