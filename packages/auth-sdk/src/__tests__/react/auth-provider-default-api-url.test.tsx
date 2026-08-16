/**
 * Phase A1 ENV-DIET (2026-05-05) — hardcoded production default for `apiUrl`.
 *
 * Stripe-style pattern: when neither the `apiUrl` prop nor the
 * `NEXT_PUBLIC_EZAUTH_API_URL` env var is provided, the SDK ships a
 * canonical production default (`DEFAULT_AUTH_API_URL`) so consumers
 * deployed on `*.ezstart.xyz` need ZERO env wiring in production.
 *
 * Public API stability: the explicit prop and the env var still win over
 * the default — any pre-existing wiring keeps working unchanged.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'

// Capture the resolved `clientConfig.apiUrl` so the test can assert what
// the Provider passed down to the core client. The mock mirrors the real
// `resolveSDKConfig` shape used by the other auth-provider-* tests.
const recordedConfigs: Array<{ apiUrl?: string; webUrl?: string }> = []

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
      (config: { appName?: string; publishableKey?: string; apiUrl?: string; webUrl?: string }) => {
        // Record what arrived at `resolveSDKConfig` — that is the value the
        // Provider resolved via the new Stripe-style precedence chain.
        recordedConfigs.push({ apiUrl: config.apiUrl, webUrl: config.webUrl })
        return {
          clientConfig: {
            apiUrl: `${config.apiUrl ?? 'unset'}/api/auth`,
            appName: config.appName ?? 'pending',
          },
          webUrl: config.webUrl ?? 'http://localhost:6111',
          keyFetch: null,
        }
      }
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

import { AuthProvider } from '../../react/auth-provider.js'
import { DEFAULT_AUTH_API_URL } from '../../core/defaults.js'

const originalEnvUrl = process.env.NEXT_PUBLIC_EZAUTH_API_URL

describe('AuthProvider — Phase A1 hardcoded prod apiUrl default', () => {
  beforeEach(() => {
    recordedConfigs.length = 0
    localStorage.clear()
    delete process.env.NEXT_PUBLIC_EZAUTH_API_URL
  })

  afterEach(() => {
    vi.clearAllMocks()
    if (originalEnvUrl === undefined) {
      delete process.env.NEXT_PUBLIC_EZAUTH_API_URL
    } else {
      process.env.NEXT_PUBLIC_EZAUTH_API_URL = originalEnvUrl
    }
  })

  it('falls back to DEFAULT_AUTH_API_URL when neither prop nor env var is provided', async () => {
    render(
      <AuthProvider appName="myapp">
        <div data-testid="probe">child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(recordedConfigs.length).toBeGreaterThan(0)
    })

    // The Provider resolved the apiUrl via the Stripe-style precedence:
    //   1. explicit prop          → undefined here
    //   2. process.env.*          → undefined here (deleted above)
    //   3. DEFAULT_AUTH_API_URL   → wins
    expect(recordedConfigs[0]?.apiUrl).toBe(DEFAULT_AUTH_API_URL)
  })

  it('explicit `apiUrl` prop wins over the default', async () => {
    render(
      <AuthProvider appName="myapp" apiUrl="https://custom.example.com">
        <div data-testid="probe">child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(recordedConfigs.length).toBeGreaterThan(0)
    })

    expect(recordedConfigs[0]?.apiUrl).toBe('https://custom.example.com')
  })

  it('NEXT_PUBLIC_EZAUTH_API_URL env var wins over the default', async () => {
    process.env.NEXT_PUBLIC_EZAUTH_API_URL = 'http://localhost:6110'

    render(
      <AuthProvider appName="myapp">
        <div data-testid="probe">child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(recordedConfigs.length).toBeGreaterThan(0)
    })

    expect(recordedConfigs[0]?.apiUrl).toBe('http://localhost:6110')
  })

  it('explicit prop wins over both the env var and the default', async () => {
    process.env.NEXT_PUBLIC_EZAUTH_API_URL = 'http://localhost:6110'

    render(
      <AuthProvider appName="myapp" apiUrl="https://prop-wins.example.com">
        <div data-testid="probe">child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(recordedConfigs.length).toBeGreaterThan(0)
    })

    expect(recordedConfigs[0]?.apiUrl).toBe('https://prop-wins.example.com')
  })

  it('DEFAULT_AUTH_API_URL is the canonical EZAuth cloud host', () => {
    // Locks the shipped value so accidental edits surface in CI.
    expect(DEFAULT_AUTH_API_URL).toBe('https://ezauth-api.ezstart.xyz')
  })
})
