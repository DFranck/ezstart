/**
 * Tests for `<RequireTwoFactor>` — defense-in-depth client-side gate
 * mirroring the backend `requireTwoFactor()` Express middleware. Blocks
 * elevated-role users (admin / superadmin) from rendering admin UI until
 * they enroll 2FA.
 *
 * Behavior matrix :
 * - Not authenticated → render null (RequireAuth handles).
 * - Plain user → render children (no-op).
 * - Elevated user + 2FA enrolled → render children.
 * - Elevated user + 2FA NOT enrolled → render fallback (default Card or
 *   custom).
 * - Custom texts override the EN defaults.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import {
  RequireTwoFactor,
  DEFAULT_REQUIRE_TWO_FACTOR_TEXTS,
} from '../../components/RequireTwoFactor.js'
import { createTestStore, TestAuthProvider } from '../testProvider.js'
import type { AuthStoreApi } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

function makeWrapper(store: AuthStoreApi) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestAuthProvider store={store}>{children}</TestAuthProvider>
  }
}

describe('<RequireTwoFactor>', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('renders nothing when no user is authenticated (RequireAuth handles)', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <RequireTwoFactor>
          <span data-testid="protected">Admin UI</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders children for plain users (no elevated role) regardless of 2FA', () => {
    const user = createTestUser({
      globalRoles: [],
      appRoles: { myapp: ['user'] },
      twoFactorEnabled: false,
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireTwoFactor>
          <span data-testid="protected">Visible to plain user</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('renders children for superadmin WITH 2FA enrolled', () => {
    const user = createTestUser({
      globalRoles: ['superadmin'],
      twoFactorEnabled: true,
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireTwoFactor>
          <span data-testid="protected">Admin dashboard</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('renders default fallback for superadmin WITHOUT 2FA enrolled', () => {
    const user = createTestUser({
      globalRoles: ['superadmin'],
      twoFactorEnabled: false,
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireTwoFactor>
          <span data-testid="protected">Should not render</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    // Default texts surfaced
    expect(screen.getByText(DEFAULT_REQUIRE_TWO_FACTOR_TEXTS.title)).toBeInTheDocument()
    expect(screen.getByText(DEFAULT_REQUIRE_TWO_FACTOR_TEXTS.description)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: DEFAULT_REQUIRE_TWO_FACTOR_TEXTS.cta })
    ).toBeInTheDocument()
  })

  it('treats undefined twoFactorEnabled as un-enrolled (defensive default)', () => {
    // Legacy AuthUser payloads (pre-2FA_MANDATORY_ADMIN-001) omit the
    // field. Consumer must not accidentally render admin UI for an admin
    // whose enrollment state is unknown.
    const user = createTestUser({
      globalRoles: ['superadmin'],
      // twoFactorEnabled NOT set
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireTwoFactor>
          <span data-testid="protected">Should not render</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    expect(screen.getByText(DEFAULT_REQUIRE_TWO_FACTOR_TEXTS.title)).toBeInTheDocument()
  })

  it('renders default fallback for app-level admin without 2FA', () => {
    const user = createTestUser({
      globalRoles: [],
      appRoles: { 'green-pulse': ['admin'] },
      twoFactorEnabled: false,
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireTwoFactor>
          <span data-testid="protected">Should not render</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    expect(screen.getByText(DEFAULT_REQUIRE_TWO_FACTOR_TEXTS.title)).toBeInTheDocument()
  })

  it('renders children for app-level admin WITH 2FA enrolled', () => {
    const user = createTestUser({
      globalRoles: [],
      appRoles: { 'green-pulse': ['admin'] },
      twoFactorEnabled: true,
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireTwoFactor>
          <span data-testid="protected">Visible to enrolled app admin</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const user = createTestUser({
      globalRoles: ['superadmin'],
      twoFactorEnabled: false,
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireTwoFactor fallback={<span data-testid="custom">Set up 2FA please</span>}>
          <span data-testid="protected">Hidden</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(screen.getByTestId('custom')).toBeInTheDocument()
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    // Default Card text MUST NOT leak when a custom fallback is provided.
    expect(screen.queryByText(DEFAULT_REQUIRE_TWO_FACTOR_TEXTS.title)).not.toBeInTheDocument()
  })

  it('overrides default texts with the texts prop', () => {
    const user = createTestUser({
      globalRoles: ['superadmin'],
      twoFactorEnabled: false,
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireTwoFactor
          texts={{
            title: 'Authentification à deux facteurs requise',
            cta: 'Activer maintenant',
          }}
        >
          <span data-testid="protected">Hidden</span>
        </RequireTwoFactor>
      </Wrapper>
    )
    expect(screen.getByText('Authentification à deux facteurs requise')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activer maintenant' })).toBeInTheDocument()
    // Description falls back to EN default (partial override).
    expect(screen.getByText(DEFAULT_REQUIRE_TWO_FACTOR_TEXTS.description)).toBeInTheDocument()
  })
})
