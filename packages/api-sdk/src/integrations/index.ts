/**
 * @ezstart/api-sdk/integrations
 *
 * Third-party service integrations (React-based). Each integration is a
 * thin, framework-friendly wrapper around a public vendor SDK / script.
 *
 * Components ship with a silent no-op logger by default — pass a real
 * logger via the `logger` prop to capture render / network errors.
 */

export { TurnstileWidget } from './turnstile-widget.js'
export type { TurnstileWidgetProps, TurnstileWidgetLogger } from './turnstile-widget.js'
