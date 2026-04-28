/**
 * Tests for the SSR `initialUser` bootstrap on `<AuthProvider>` (Clerk-style).
 *
 * The contract: when the consumer passes `initialUser` (typically resolved
 * server-side via `getServerAuth()`), the per-Provider Zustand store MUST
 * boot with `{ user, isAuthenticated: true, isAuthReady: true }` so
 * subscribers reading `useAuth()` see the right `isAuthenticated` value
 * on the FIRST render — eliminating the `<LoginButton>` flash that would
 * otherwise occur in `httpOnly` mode while the async `/me` request resolves.
 *
 * After the factory + Context refactor, this is now guaranteed by
 * construction: the store is created via
 *   `useState(() => createAuthStore({ initialUser }))`
 * which makes `initialUser` part of the very first state snapshot React
 * observes.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

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
    resolveSDKConfig: vi.fn((config: { appName?: string; publishableKey?: string }) => ({
      clientConfig: {
        apiUrl: 'http://localhost:6110/api/auth',
        appName: config.appName ?? 'pending',
      },
      webUrl: 'http://example.com',
      keyFetch: null,
    })),
    fetchKeyConfig: vi.fn(),
  }
})

import { AuthProvider, useAuthStore } from '../../react/auth-provider.js'
import type { AuthState } from '../../react/store.js'
import type { AuthUser } from '../../core/types.js'

const userFixture: AuthUser = {
  _id: 'u_1',
  email: 'jane@example.com',
  username: 'jane',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

/**
 * A probe component that records the snapshot it observes on each render.
 * Used to assert what `useAuthStore` returns on the *very first* render —
 * which is the whole point of the SSR bootstrap (no flash).
 */
function StateProbe({ snapshots }: { snapshots: AuthState[] }) {
  const state = useAuthStore()
  snapshots.push(state)
  return <div data-testid="probe">{state.isAuthenticated ? 'auth' : 'guest'}</div>
}

describe('AuthProvider — initialUser SSR bootstrap', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('hydrates the store synchronously when `initialUser` is provided', () => {
    const snapshots: AuthState[] = []

    render(
      <AuthProvider
        appName="myapp"
        apiUrl="http://api.test"
        initialUser={userFixture}
        storageKey={`probe-${Date.now()}-1`}
      >
        <StateProbe snapshots={snapshots} />
      </AuthProvider>
    )

    // First snapshot MUST already reflect the SSR user — this is the
    // non-regression test for the LoginButton flash.
    expect(snapshots.length).toBeGreaterThan(0)
    const first = snapshots[0]!
    expect(first.user).toEqual(userFixture)
    expect(first.isAuthenticated).toBe(true)
    expect(first.isAuthReady).toBe(true)
  })

  it('boots with empty state when `initialUser` is omitted', () => {
    const snapshots: AuthState[] = []

    render(
      <AuthProvider appName="myapp" apiUrl="http://api.test" storageKey={`probe-${Date.now()}-2`}>
        <StateProbe snapshots={snapshots} />
      </AuthProvider>
    )

    const first = snapshots[0]!
    expect(first.user).toBeNull()
    expect(first.isAuthenticated).toBe(false)
  })

  it('boots with empty state when `initialUser` is null', () => {
    const snapshots: AuthState[] = []

    render(
      <AuthProvider
        appName="myapp"
        apiUrl="http://api.test"
        initialUser={null}
        storageKey={`probe-${Date.now()}-3`}
      >
        <StateProbe snapshots={snapshots} />
      </AuthProvider>
    )

    const first = snapshots[0]!
    expect(first.user).toBeNull()
    expect(first.isAuthenticated).toBe(false)
  })

  it('keeps the same store instance across re-renders (factory called once)', () => {
    const snapshots: AuthState[] = []

    const { rerender } = render(
      <AuthProvider
        appName="myapp"
        apiUrl="http://api.test"
        initialUser={userFixture}
        storageKey={`probe-${Date.now()}-4`}
      >
        <StateProbe snapshots={snapshots} />
      </AuthProvider>
    )

    rerender(
      <AuthProvider
        appName="myapp"
        apiUrl="http://api.test"
        initialUser={userFixture}
        storageKey={`probe-${Date.now()}-4`}
      >
        <StateProbe snapshots={snapshots} />
      </AuthProvider>
    )

    // All snapshots reflect the SSR user — the store identity is stable
    // across re-renders (useState((init)) only calls init once).
    for (const snap of snapshots) {
      expect(snap.user).toEqual(userFixture)
      expect(snap.isAuthenticated).toBe(true)
    }
  })
})
