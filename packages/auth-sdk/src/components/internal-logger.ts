/**
 * Internal silent-by-default logger for auth-sdk components.
 *
 * The SDK is publishable npm-standalone — components MUST NOT depend on
 * `@ezstart/logger` (cf. eslint rule `@ezstart/ezstart/auth-sdk`). To keep
 * a useful debug surface during dev without forcing every consumer to
 * install Pino, we ship a no-op logger here. Consumers who want real logs
 * pass a logger to `<AuthProvider logger={...} />` and wire their own
 * surface (toast, console, Sentry, etc.) — that logger is exposed via
 * `useAuthLogger()` for components that need it.
 *
 * @internal
 */

export interface ClientLogger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

/** Silent default — no console writes, no exceptions. */
export const logger: ClientLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
