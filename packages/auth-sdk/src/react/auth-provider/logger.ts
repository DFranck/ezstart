/**
 * Opt-in logger surface for the `<AuthProvider>` (avoids a hard dependency on
 * `@ezstart/logger` — the SDK stays agnostic per the packaging rule).
 *
 * Extracted from `auth-provider.tsx` (Wave D Lot 4). `AuthLogger` is
 * re-exported from `auth-provider.tsx` so the public barrel import path
 * (`@ezstart/auth-sdk` → `./auth-provider.js`) is unchanged.
 *
 * @module @ezstart/auth-sdk/react/auth-provider/logger
 */

/**
 * Minimal structured-logger surface accepted by `<AuthProvider logger={...}>`.
 * Defaults to {@link noopLogger} so consumers who wire nothing get total
 * silence (no `console.*` from the SDK).
 */
export interface AuthLogger {
  debug: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
}

/** Silent no-op logger — the default when the consumer wires none. */
export const noopLogger: AuthLogger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
}
