'use client'

import { TurnstileWidget as _TurnstileWidget } from '@ezstart/api-sdk/integrations'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import type { TurnstileWidgetProps as _TurnstileWidgetProps } from '@ezstart/api-sdk/integrations'
import { logger } from './internal-logger.js'

/**
 * @deprecated Moved to `@ezstart/api-sdk/integrations`. Will be removed in 2026-08-01.
 */
export type TurnstileWidgetProps = _TurnstileWidgetProps

/**
 * Cloudflare Turnstile captcha widget that mounts the challenge iframe and
 * forwards the resulting token to the consumer via `onVerify`.
 *
 * @deprecated Moved to `@ezstart/api-sdk/integrations`. Will be removed in 2026-08-01.
 * Cloudflare Turnstile is a generic captcha integration — not auth-specific —
 * so it now lives in `@ezstart/api-sdk` next to the other third-party
 * integrations the SDK exposes.
 *
 * @example migration
 * ```tsx
 * // before
 * import { TurnstileWidget } from '@ezstart/auth-sdk/components'
 *
 * // after
 * import { TurnstileWidget } from '@ezstart/api-sdk/integrations'
 * ```
 */
export function TurnstileWidget(props: TurnstileWidgetProps) {
  useDeprecationWarning(
    'TurnstileWidget from @ezstart/auth-sdk',
    'TurnstileWidget from @ezstart/api-sdk/integrations'
  )
  // Forward the SDK's silent-by-default logger so any render / script failures
  // surface in dev tools when a real logger is configured at the SDK level.
  return <_TurnstileWidget logger={logger} {...props} />
}

TurnstileWidget.displayName = 'TurnstileWidget'
