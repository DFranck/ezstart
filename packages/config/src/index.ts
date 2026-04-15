// Main exports — CLIENT-SAFE ONLY.
// Server-only helpers (secrets-loader: fs, path, dotenv) live in `./server`.
export * from './urls.js'
export * from './cors.js'
export * from './env.js'
export * from './env-resolvers.js'
export { ENV_MANIFESTS, SHARED_REQUIRED, getRequiredEnv, hasEnvManifest } from './env-manifests.js'
export type { ApiAppName } from './env-manifests.js'

// Re-export commonly used functions
export { URLS } from './urls.js'
export {
  getAllowedOrigins,
  createCorsConfig,
  setCorsDependencies,
  getCorsDependencies,
} from './cors.js'
export { getAppUrls, isLocal, isProduction } from './env.js'

// Re-export new registry and domain utilities
export {
  getRegistry,
  registerApp,
  resetRegistry,
  setRootDomain,
  getRootDomain,
  isProjectDomain,
} from './urls.js'
export type { AppConfig } from './urls.js'
