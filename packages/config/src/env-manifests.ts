/**
 * Centralized manifest of required environment variables, per API app.
 *
 * All names are GENERIC (no app prefix) — the root `.env.{local,staging,production}`
 * now stores every var without per-app prefixing, so what's required at runtime
 * matches the root key verbatim.
 *
 * Shared vars required by every API are declared in `SHARED_REQUIRED` and
 * auto-merged into every app's required list by `getRequiredEnv()`.
 *
 * Consumed by `createApp({ apiApp })` which auto-looks up the required list.
 */

/**
 * Env vars required by EVERY API app.
 *
 * - `JWT_SECRET`  — shared by design (SSO tokens minted by ezauth must
 *                    verify on every app without re-keying).
 * - `MONGO_URL`   — generic template (`{app}-{env}` interpolated per app
 *                    via `@ezstart/config/env-resolvers.getMongoUrl`).
 *
 * NOTE: `NODE_ENV` is intentionally NOT required — Node defaults it and every
 * deploy target sets it explicitly.
 */
export const SHARED_REQUIRED = ['JWT_SECRET', 'MONGO_URL'] as const

export const ENV_MANIFESTS = {
  ezauth: {
    required: ['OAUTH_STATE_SECRET'],
  },
  ezbill: {
    required: [],
  },
  ezpay: {
    required: ['STRIPE_SECRET_KEY'],
  },
  ezstart: {
    required: [],
  },
  'green-pulse': {
    required: [],
  },
  'gacha-analyzer': {
    required: [],
  },
} as const satisfies Record<string, { required: readonly string[] }>

export type ApiAppName = keyof typeof ENV_MANIFESTS

export function getRequiredEnv(app: ApiAppName): readonly string[] {
  return [...SHARED_REQUIRED, ...ENV_MANIFESTS[app].required]
}

export function hasEnvManifest(app: string): app is ApiAppName {
  return app in ENV_MANIFESTS
}
