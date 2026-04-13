/**
 * Centralized manifest of required environment variables, per API app.
 *
 * Names are UNPREFIXED (runtime names) — the root `.env.{NODE_ENV}` stores
 * them with an `{APP}_` prefix that the loader strips at boot.
 *
 * Single source of truth, mirroring `urls.ts` / `ports.ts`.
 * Consumed by `createApp({ apiApp })` which auto-looks up the required list.
 */

export const ENV_MANIFESTS = {
  ezauth: {
    required: ['MONGO_URL', 'JWT_SECRET', 'OAUTH_STATE_SECRET'],
  },
  ezbill: {
    required: ['MONGO_URL', 'JWT_SECRET'],
  },
  ezpay: {
    required: ['MONGO_URL', 'JWT_SECRET'],
  },
  ezstart: {
    required: ['MONGO_URL', 'JWT_SECRET'],
  },
  'green-pulse': {
    required: ['MONGO_URL', 'JWT_SECRET'],
  },
  'gacha-analyzer': {
    required: ['MONGO_URL', 'JWT_SECRET'],
  },
} as const satisfies Record<string, { required: readonly string[] }>

export type ApiAppName = keyof typeof ENV_MANIFESTS

export function getRequiredEnv(app: ApiAppName): readonly string[] {
  return ENV_MANIFESTS[app].required
}

export function hasEnvManifest(app: string): app is ApiAppName {
  return app in ENV_MANIFESTS
}
