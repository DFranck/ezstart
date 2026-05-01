'use client'

import { useEffect } from 'react'
import { warnDeprecation } from '@ezstart/logger'
import { toast } from 'sonner'

/**
 * Surface a deprecation notice once per session when a deprecated component
 * mounts. Wraps `@ezstart/logger`'s `warnDeprecation` and routes the message
 * through `sonner.toast.warning` so the dev sees a visible toast on
 * navigation — not just a silent console line.
 *
 * **Console warn fires in every env (incl. production)** so error trackers
 * (Sentry, Better Stack, etc.) can surface deprecated usage. The toast is
 * dev-only — `warnDeprecation` gates the toast invocation on `NODE_ENV`
 * internally, so a prod end user never sees an actionable-by-the-operator
 * notice.
 *
 * The notice fires ONCE per `name` per page session (deduped via a module
 * `Set` inside `@ezstart/logger`) — re-renders don't spam.
 *
 * @example
 * ```tsx
 * import { useDeprecationWarning } from '@ezstart/ui/hooks'
 *
 * export function ClientLayout(props) {
 *   useDeprecationWarning('ClientLayout', 'AppShell from @ezstart/ui')
 *   // ...rest of legacy implementation
 * }
 * ```
 *
 * @public
 */
export function useDeprecationWarning(name: string, replacement?: string): void {
  useEffect(() => {
    warnDeprecation(name, replacement, {
      toast: message => {
        toast.warning(message, {
          id: `deprecation-${name}`,
          description: 'This component will be removed in a future version.',
          duration: 8000,
        })
      },
    })
  }, [name, replacement])
}
