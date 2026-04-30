'use client'

import { useCallback, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { ConnectResumeRequest, ConnectResumeResponse } from '../../core/types/index.js'

/**
 * Resume an in-progress Stripe Connect onboarding (status='pending' AND
 * createdAt < 7 days). On success returns a fresh Stripe `accountLinks.create`
 * URL the caller redirects the user to.
 *
 * Throws if the row is not pending, expired (>7d), or not owned by the caller.
 *
 * @example
 * ```tsx
 * const { resume, isPending, error } = useConnectResume()
 *
 * async function onClick() {
 *   try {
 *     const { accountLinkUrl } = await resume({ connectedAccountId: account._id! })
 *     window.location.href = accountLinkUrl
 *   } catch (err) {
 *     toast.error(err.message)
 *   }
 * }
 * ```
 */
export function useConnectResume() {
  const { client } = usePayContext()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resume = useCallback(
    async (data: ConnectResumeRequest): Promise<ConnectResumeResponse> => {
      setIsPending(true)
      setError(null)
      try {
        const result = await client.connectResume(data)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to resume onboarding'
        setError(message)
        throw err
      } finally {
        setIsPending(false)
      }
    },
    [client]
  )

  return {
    resume,
    isPending,
    error,
  }
}
