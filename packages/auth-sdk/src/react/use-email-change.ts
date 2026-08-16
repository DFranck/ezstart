'use client'

/**
 * React Query mutation hooks for the email-change flow.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation } from '@tanstack/react-query'

interface RequestEmailChangeInput {
  newEmail: string
  password?: string
  locale?: string
  app?: string
}

interface RequestEmailChangeResponse {
  message: string
  expiresAt: string
}

interface VerifyEmailChangeResponse {
  message: string
}

/**
 * Mutation: request an email change. The verification link is sent to
 * the NEW email address.
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useRequestEmailChange()
 * mutate({ newEmail: 'new@example.com', password: 'current' })
 * ```
 */
export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (input: RequestEmailChangeInput) => {
      const body: Record<string, unknown> = { newEmail: input.newEmail }
      if (input.password !== undefined) body.password = input.password
      if (input.locale !== undefined) body.locale = input.locale
      if (input.app !== undefined) body.app = input.app
      return apiCall<RequestEmailChangeResponse>('/auth/change-email', {
        appName: 'ezauth',
        method: 'POST',
        body,
      })
    },
  })
}

/**
 * Mutation: verify an email-change token. Exposed via React Query so
 * the verify page can call it inside a `useEffect` and surface the
 * success/error state with the standard mutation lifecycle.
 *
 * @example
 * ```tsx
 * const { mutate, isPending, isSuccess, isError } = useVerifyEmailChange()
 * useEffect(() => { mutate({ token }) }, [mutate, token])
 * ```
 */
export function useVerifyEmailChange() {
  return useMutation({
    mutationFn: ({ token }: { token: string }) =>
      apiCall<VerifyEmailChangeResponse>(
        `/auth/email-change/verify?token=${encodeURIComponent(token)}`,
        { appName: 'ezauth', method: 'GET' }
      ),
  })
}
