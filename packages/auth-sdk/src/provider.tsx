/**
 * Backward-compatibility shim.
 *
 * Components in `components/` import `../provider.js` for `useAuth` and
 * `useAuthContext`. This file re-exports the monorepo-specific versions
 * so those imports continue to work without modification.
 */
export {
  EzstartAuthProvider as AuthProvider,
  useEzstartAuth as useAuth,
  useEzstartAuthContext as useAuthContext,
} from './ezstart-auth.js'
