'use client'

import { useCallback, useState } from 'react'
import { usePayContext } from '../pay-provider.js'

/**
 * React hook that opens a Stripe Customer Portal session.
 *
 * On success, the browser is redirected to the portal URL via
 * `window.location.href`. Consumers can also read `loading` / `error`
 * to render progress and failure UI.
 *
 * @example
 * ```tsx
 * const { openPortal, loading, error } = useBillingPortal()
 * return (
 *   <Button onClick={() => openPortal(window.location.href)} disabled={loading}>
 *     Manage subscription
 *   </Button>
 * )
 * ```
 */
export function useBillingPortal() {
  const { client } = usePayContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const openPortal = useCallback(
    async (returnUrl?: string): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        const { url } = await client.createBillingPortalSession({ returnUrl })
        if (typeof window !== 'undefined') {
          window.location.href = url
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to open billing portal'))
        setLoading(false)
      }
    },
    [client]
  )

  return { openPortal, loading, error }
}
