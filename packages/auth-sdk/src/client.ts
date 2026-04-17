/**
 * Backward-compatibility shim.
 *
 * Re-exports the core auth client. Components and consumers that
 * import from `./client.js` continue to work.
 */
export { CoreAuthClient as AuthClient, createCoreAuthClient as createAuthClient } from './core/auth-client.js'
export type { AuthClientConfig } from './core/types.js'
