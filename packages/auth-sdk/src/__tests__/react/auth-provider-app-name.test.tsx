/**
 * Regression test for the multi-tenant appName propagation bug.
 *
 * Scenario — ezpay web bootstraps with a platform-scoped `admin` publishable
 * key whose `/api/keys/config` response says `appName: 'ezauth'`. The ezpay
 * `<AuthProvider appName="ezpay">` MUST keep its explicit `ezpay` app name
 * — overriding it with the key's owner would cause `/auth/token` callbacks
 * to post `app: 'ezauth'` while the code was issued for `app: 'ezpay'`,
 * returning a 400 "Invalid or expired authorization code".
 *
 * The fix in `auth-provider.tsx` only calls `client.setAppName(configAppName)`
 * when the consumer did NOT provide an explicit `appName` (or passed the
 * `'pending'` placeholder).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'

// Factory-style mock to avoid hoisting issues with class references.
vi.mock('../../core/auth-client.js', () => {
  const instances: Array<{
    setAppName: ReturnType<typeof vi.fn>
    setApiUrl: ReturnType<typeof vi.fn>
    getAppName: ReturnType<typeof vi.fn>
    getApiUrl: ReturnType<typeof vi.fn>
    verifyToken: ReturnType<typeof vi.fn>
    refreshTokens: ReturnType<typeof vi.fn>
    getCurrentUser: ReturnType<typeof vi.fn>
    logout: ReturnType<typeof vi.fn>
  }> = []

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
    constructor() {
      instances.push(this as unknown as (typeof instances)[number])
    }
  }

  return {
    CoreAuthClient: MockCoreAuthClient,
    createCoreAuthClient: (..._args: unknown[]) => new MockCoreAuthClient(),
    resolveSDKConfig: vi.fn((config: { appName?: string; publishableKey?: string }) => ({
      clientConfig: {
        apiUrl: 'http://localhost:6110/api/auth',
        appName: config.appName ?? 'pending',
      },
      webUrl: 'http://example.com',
      keyFetch: config.publishableKey
        ? {
            publishableKey: config.publishableKey,
            apiBaseUrl: 'http://localhost:6110',
          }
        : null,
    })),
    fetchKeyConfig: vi.fn(async () => ({
      appName: 'ezauth',
      apiUrl: 'http://api.example.com',
      webUrl: 'http://web.example.com',
      features: ['*'],
      plan: 'free',
      quotaMonthly: -1,
      scope: 'admin' as const,
    })),
    __mockInstances: instances,
  }
})

import { AuthProvider } from '../../react/auth-provider.js'
import * as authClientModule from '../../core/auth-client.js'

interface MockInstance {
  setAppName: ReturnType<typeof vi.fn>
  setApiUrl: ReturnType<typeof vi.fn>
}
const getLatestInstance = (): MockInstance => {
  const mod = authClientModule as unknown as { __mockInstances: MockInstance[] }
  const last = mod.__mockInstances[mod.__mockInstances.length - 1]
  if (!last) throw new Error('No mock CoreAuthClient instance created')
  return last
}

describe('AuthProvider — explicit appName is authoritative over key config', () => {
  beforeEach(() => {
    const mod = authClientModule as unknown as { __mockInstances: MockInstance[] }
    mod.__mockInstances.length = 0
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the consumer appName when the publishable key returns a different appName', async () => {
    render(
      <AuthProvider
        appName="ezpay"
        publishableKey="ez_pk_live_platformkey"
        apiUrl="http://api.test"
      >
        <div>child</div>
      </AuthProvider>
    )

    const instance = getLatestInstance()
    await waitFor(() => {
      // setApiUrl is called unconditionally when config.apiUrl resolves — use as the "config resolved" signal.
      expect(instance.setApiUrl).toHaveBeenCalled()
    })

    // setAppName MUST NOT be called — consumer explicitly set `appName="ezpay"`
    expect(instance.setAppName).not.toHaveBeenCalled()
  })

  it('updates the client appName when consumer omits it (pending placeholder case)', async () => {
    render(
      <AuthProvider publishableKey="ez_pk_live_platformkey" apiUrl="http://api.test">
        <div>child</div>
      </AuthProvider>
    )

    const instance = getLatestInstance()
    await waitFor(() => {
      expect(instance.setAppName).toHaveBeenCalledWith('ezauth')
    })
  })
})
