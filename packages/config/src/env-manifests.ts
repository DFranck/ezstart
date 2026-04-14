/**
 * Centralized manifest of required environment variables, per API app.
 *
 * Names are UNPREFIXED (runtime names) — the root `.env.{NODE_ENV}` stores
 * per-app vars with an `{APP}_` prefix that the loader strips at boot.
 *
 * Shared vars (no prefix in root) are declared in `SHARED_REQUIRED` and
 * auto-merged into every app's required list by `getRequiredEnv()`.
 *
 * Single source of truth, mirroring `urls.ts` / `ports.ts`.
 * Consumed by `createApp({ apiApp })` which auto-looks up the required list.
 */

/**
 * Env vars required by EVERY API app (shared, unprefixed in root).
 *
 * - `JWT_SECRET` — shared by design so SSO tokens minted by ezauth can be
 *   verified by every other app without re-keying.
 *
 * NOTE: `NODE_ENV` is intentionally NOT required — Node defaults it and every
 * deploy target sets it explicitly.
 */
export const SHARED_REQUIRED = ['JWT_SECRET'] as const

export const ENV_MANIFESTS = {
  ezauth: {
    required: ['MONGO_URL', 'OAUTH_STATE_SECRET'],
  },
  ezbill: {
    required: ['MONGO_URL'],
  },
  ezpay: {
    required: ['MONGO_URL', 'STRIPE_SECRET_KEY'],
  },
  ezstart: {
    required: ['MONGO_URL'],
  },
  'green-pulse': {
    required: ['MONGO_URL'],
  },
  'gacha-analyzer': {
    required: ['MONGO_URL'],
  },
} as const satisfies Record<string, { required: readonly string[] }>

export type ApiAppName = keyof typeof ENV_MANIFESTS

export function getRequiredEnv(app: ApiAppName): readonly string[] {
  return [...SHARED_REQUIRED, ...ENV_MANIFESTS[app].required]
}

export function hasEnvManifest(app: string): app is ApiAppName {
  return app in ENV_MANIFESTS
}
