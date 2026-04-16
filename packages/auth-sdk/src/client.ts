/**
 * Backward-compatibility shim.
 *
 * Re-exports the monorepo-specific AuthClient and factory from ezstart-auth.
 * Components and consumers that import from `./client.js` continue to work.
 */
export {
  AuthClient,
  createAuthClient,
  detectAuthMode,
  type AuthClientConfig,
} from './ezstart-auth.js'
