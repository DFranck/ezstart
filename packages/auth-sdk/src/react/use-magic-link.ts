'use client'

/**
 * React Query mutations for the magic-link sign-in flow.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation } from '@tanstack/react-query'

interface RequestMagicLinkInput {
  email: string
  app?: string
  redirectUri?: string
  locale?: string
}

interface RequestMagicLinkResponse {
  message: string
}

interface VerifyMagicLinkResponse {
  message: string
  user: {
    _id: string
    email: string
    username: string
  }
  redirectTo: string
}

/**
 * Mutation: request a magic-link sign-in email.
 *
 * The response is intentionally generic (anti-enumeration). The hook
 * resolves successfully even when the email does not exist on the
 * server — only network/server errors throw.
 */
export function useRequestMagicLink() {
  return useMutation({
    mutationFn: (input: RequestMagicLinkInput) => {
      const body: Record<string, unknown> = { email: input.email }
      if (input.app !== undefined) body.app = input.app
      if (input.redirectUri !== undefined) body.redirect_uri = input.redirectUri
      if (input.locale !== undefined) body.locale = input.locale
      return apiCall<RequestMagicLinkResponse>('/auth/magic-link/request', {
        appName: 'ezauth',
        method: 'POST',
        body,
      })
    },
  })
}

/**
 * Mutation: verify a magic-link token. On success the server has set
 * the auth cookies; the consumer should navigate to `redirectTo`.
 */
export function useVerifyMagicLink() {
  return useMutation({
    mutationFn: ({ token }: { token: string }) =>
      apiCall<VerifyMagicLinkResponse>(
        `/auth/magic-link/verify?token=${encodeURIComponent(token)}`,
        { appName: 'ezauth', method: 'GET' }
      ),
  })
}
