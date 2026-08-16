/**
 * Internal silent-by-default logger for auth-sdk components.
 *
 * The SDK is publishable npm-standalone — components MUST NOT depend on
 * `@ezstart/logger` at runtime (cf. eslint rule `@ezstart/ezstart/auth-sdk`).
 * We re-use the canonical {@link Logger} interface as a **type-only** import
 * so the consumer's bundle never sees `@ezstart/logger` while every SDK in
 * the monorepo still speaks the exact same logger contract.
 *
 * Consumers who want real logs pass a logger to
 * `<AuthProvider logger={...} />` and wire their own surface (toast,
 * console, Sentry, etc.) — that logger is exposed via `useAuthLogger()`
 * for components that need it.
 *
 * @internal
 */

import type { Logger } from '@ezstart/logger'

/**
 * Re-export the canonical {@link Logger} shape under the legacy
 * `ClientLogger` name so existing imports keep working. New code should
 * import `Logger` directly from `@ezstart/logger`.
 *
 * @deprecated Import `type { Logger } from '@ezstart/logger'` instead.
 */
export type ClientLogger = Logger

/** Silent default — no console writes, no exceptions. */
export const logger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
