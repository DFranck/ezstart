/**
 * Phase 3 ENV-DIET (2026-05-05) — auto-resolution of `webUrl` from
 * `/keys/config` when the consumer didn't pass `webUrl` as a prop.
 *
 * Stripe-style pattern: a single publishable key + sensible defaults. The
 * SDK fetches `/keys/config` on mount and surfaces the API-returned `webUrl`
 * via the React context so consumers can drop `NEXT_PUBLIC_EZAUTH_WEB_URL`
 * from their env entirely.
 *
 * Public API stability: passing `webUrl` explicitly still wins — the
 * auto-resolve only kicks in when the prop is `undefined`.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'

// Factory mock — same shape as auth-provider-app-name.test.tsx so the
// keyFetch descriptor is returned by `resolveSDKConfig` whenever a
// publishable key is provided. The Provider then runs the effect that calls
// `fetchKeyConfig()` and propagates the resolved config into the context.
vi.mock('../../core/auth-client.js', () => {
  class MockCoreAuthClient {
    setAppName = vi.fn()
    setApiUrl = vi.fn()
    getAppName = vi.fn(() => 'pending')
    getApiUrl = vi.fn(() => 'http://localhost:6110/api/auth')
    verifyToken = vi.fn(async () => true)
    refreshTokens = vi.fn(async () => ({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 3600,
      user: null,
    }))
    getCurrentUser = vi.fn(async () => null)
    logout = vi.fn(async () => undefined)
  }

  return {
    CoreAuthClient: MockCoreAuthClient,
    createCoreAuthClient: () => new MockCoreAuthClient(),
    resolveSDKConfig: vi.fn(
      (config: { appName?: string; publishableKey?: string; webUrl?: string }) => ({
        clientConfig: {
          apiUrl: 'http://localhost:6110/api/auth',
          appName: config.appName ?? 'pending',
        },
        // Mirror the production behaviour: when webUrl prop is omitted, the
        // resolver returns a localhost dev default. The provider should
        // override this with the value from `/keys/config` once it resolves.
        webUrl: config.webUrl ?? 'http://localhost:6111',
        keyFetch: config.publishableKey
          ? {
              publishableKey: config.publishableKey,
              apiBaseUrl: 'http://localhost:6110',
            }
          : null,
      })
    ),
    fetchKeyConfig: vi.fn(async () => ({
      appName: 'consumerapp',
      apiUrl: 'http://api.example.com',
      webUrl: 'https://auth.example.com',
      features: ['*'],
      plan: 'free',
      quotaMonthly: -1,
      scope: 'admin' as const,
    })),
  }
})

import { AuthProvider, useAuthContext } from '../../react/auth-provider.js'

function ProbeWebUrl({ recorded }: { recorded: { webUrl: string | undefined } }) {
  const ctx = useAuthContext()
  recorded.webUrl = ctx.webUrl
  return <div data-testid="probe">{ctx.webUrl ?? 'no-url'}</div>
}

describe('AuthProvider — Phase 3 auto-resolve webUrl from /keys/config', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('auto-resolves `webUrl` from /keys/config when prop is omitted', async () => {
    const recorded: { webUrl: string | undefined } = { webUrl: undefined }

    render(
      <AuthProvider
        appName="consumerapp"
        publishableKey="ez_pk_live_resolve_me"
        apiUrl="http://api.test"
      >
        <ProbeWebUrl recorded={recorded} />
      </AuthProvider>
    )

    // Wait for the async key-config resolve to propagate into context.
    await waitFor(() => {
      expect(recorded.webUrl).toBe('https://auth.example.com')
    })
  })

  it('explicit `webUrl` prop wins over /keys/config response (precedence)', async () => {
    const recorded: { webUrl: string | undefined } = { webUrl: undefined }

    render(
      <AuthProvider
        appName="consumerapp"
        publishableKey="ez_pk_live_resolve_me"
        apiUrl="http://api.test"
        webUrl="https://override.example.com"
      >
        <ProbeWebUrl recorded={recorded} />
      </AuthProvider>
    )

    // Even after the key config resolves, the explicit prop is authoritative.
    await waitFor(() => {
      expect(recorded.webUrl).toBe('https://override.example.com')
    })

    // Sanity: give the post-mount fetch a chance to settle. Re-assert the
    // prop value is still the one in context.
    await new Promise(r => setTimeout(r, 30))
    expect(recorded.webUrl).toBe('https://override.example.com')
  })
})
