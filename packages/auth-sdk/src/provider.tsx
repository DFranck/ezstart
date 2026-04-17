/**
 * Backward-compatibility shim.
 *
 * Components in `components/` import `../provider.js` for `useAuth` and
 * `useAuthContext`. This file re-exports from the react layer.
 */
export { AuthProvider, useAuthContext } from './react/auth-provider.js'
export { useAuth } from './react/hooks.js'
