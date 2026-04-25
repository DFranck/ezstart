// CRITICAL: load root env BEFORE any other import so that
// process.env.JWT_SECRET / MONGO_URL are populated before any module that
// checks them at import time (e.g. packages/express-core/.../middleware/auth.ts).
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'

loadSharedEnv({ app: 'ezauth', layer: 'api' })

// Resolve per-app values from generic root vars and export them under the
// runtime names the rest of the codebase expects.
process.env.MONGO_URL = getMongoUrl('ezauth')
