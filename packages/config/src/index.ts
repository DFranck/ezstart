// Main exports
export * from './urls.js'
export * from './cors.js'
export * from './env.js'
export * from './secrets-loader.js'

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
