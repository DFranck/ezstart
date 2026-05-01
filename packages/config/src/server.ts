/**
 * Server-only entry for `@ezstart/config`.
 *
 * Anything that touches Node built-ins (`fs`, `path`, `process`) at module
 * eval time MUST be exposed here — never from the package root — to keep the
 * client bundle free of `async_hooks` / `fs` resolution errors.
 */

import { loadSharedEnv } from './secrets-loader.js'
import { getMongoUrl } from './env-resolvers.js'
import type { AppName } from './urls.js'

export {
  loadSharedEnv,
  maskedEnv,
  findMonorepoRoot,
  type LoadEnvOptions,
} from './secrets-loader.js'

/**
 * Boot-time env loader for any `@ezstart` API service.
 *
 * Replaces the boilerplate that was duplicated across every
 * `apps/<app>/api/src/instrument.mts`:
 *
 *   1. Loads root `.env.{env}` shared vars + per-app `apps/<slug>/api/.env.{env}`
 *      overrides via {@link loadSharedEnv}.
 *   2. Resolves `MONGO_URL` from the templated root value via {@link getMongoUrl}
 *      and writes it back to `process.env.MONGO_URL` so downstream modules
 *      (mongoose, schedulers, auth middleware) read the per-app value.
 *
 * MUST be called from `instrument.mts` BEFORE any other import that touches
 * `process.env.JWT_SECRET` / `process.env.MONGO_URL` at module eval time.
 *
 * @example
 *   // apps/ezauth/api/src/instrument.mts
 *   import { instrumentApi } from '@ezstart/config/server'
 *   instrumentApi('ezauth')
 */
export function instrumentApi(slug: AppName): void {
  loadSharedEnv({ app: slug, layer: 'api' })
  process.env.MONGO_URL = getMongoUrl(slug)
}
