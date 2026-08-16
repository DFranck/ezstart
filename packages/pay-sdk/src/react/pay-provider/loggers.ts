/**
 * Internal fallback {@link Logger} implementations used by `<PayProvider>` and
 * its hooks. Extracted from `pay-provider.tsx` so the provider module stays a
 * thin orchestrator (standard.md §3 — file < 400 lines). Behaviour unchanged.
 *
 * @module @ezstart/pay-sdk/react/pay-provider/loggers
 */
'use client'

import type { Logger } from '@ezstart/logger'

/**
 * Default logger that mirrors the previous hard-coded `console.error`
 * behaviour. Consumers can opt out by passing `logger={silentPayLogger}` (or
 * any custom {@link Logger} implementation) to `<PayProvider>`.
 *
 * pay-sdk is publishable npm-standalone — components MUST stay agnostic
 * of `@ezstart/logger` at runtime. The default logger therefore wraps
 * `console.*` directly. Consumers wanting Pino integration pass it via
 * the `logger` prop.
 *
 * @internal
 */
/* eslint-disable @ezstart/ezstart/no-console-log -- this IS the console fallback for the default Pay logger; consumers opt-in to a real sink via the `logger` prop */
export const consoleLogger: Logger = {
  debug: (msgOrObj: string | object, dataOrMsg?: unknown) =>
    typeof msgOrObj === 'string'
      ? console.debug(msgOrObj, dataOrMsg ?? '')
      : console.debug(String(dataOrMsg ?? ''), msgOrObj),
  info: (msgOrObj: string | object, dataOrMsg?: unknown) =>
    typeof msgOrObj === 'string'
      ? console.info(msgOrObj, dataOrMsg ?? '')
      : console.info(String(dataOrMsg ?? ''), msgOrObj),
  warn: (msgOrObj: string | object, dataOrMsg?: unknown) =>
    typeof msgOrObj === 'string'
      ? console.warn(msgOrObj, dataOrMsg ?? '')
      : console.warn(String(dataOrMsg ?? ''), msgOrObj),
  error: (msgOrObj: string | object, dataOrMsg?: unknown) =>
    typeof msgOrObj === 'string'
      ? console.error(msgOrObj, dataOrMsg ?? '')
      : console.error(String(dataOrMsg ?? ''), msgOrObj),
}
/* eslint-enable @ezstart/ezstart/no-console-log */

/**
 * Silent fallback logger used when {@link usePayLogger} is called outside
 * a `<PayProvider>` (typical in isolated unit tests). Keeps components
 * usable without a provider while staying entirely silent — production
 * components MUST always render under a provider, so missing one is a
 * test-only concern, not a runtime concern.
 *
 * @internal
 */
export const silentPayLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
