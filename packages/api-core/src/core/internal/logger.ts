/**
 * @internal Default silent logger used when consumers don't opt-in.
 */
import type { ServerLogger } from '../types.js'

/**
 * A no-op logger. Follows the industry convention for agnostic libraries:
 * stay silent by default, callers opt-in to observability by passing their
 * own logger (`@ezstart/logger`, `pino`, `winston`, ...).
 *
 * @internal
 */
export const silentLogger: ServerLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
}
