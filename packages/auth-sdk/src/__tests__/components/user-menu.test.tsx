import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { useAuthStore } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

// Mock provider
const mockLogin = vi.fn()
const mockLogout = vi.fn()

vi.mock('../../react/hooks.js', () => ({
  useAuth: () => {
    const store = useAuthStore()
    return {
      user: store.user,
      isAuthenticated: store.isAuthenticated,
      isLoggingIn: store.isLoggingIn,
      isAuthReady: true,
      login: mockLogin,
      logout: mockLogout,
    }
  },
}))

vi.mock('../../react/auth-provider.js', () => ({
  useAuthContext: () => ({
    client: { getApiUrl: () => 'http://localhost:6110/api/auth' },
    appName: 'testapp',
    webUrl: 'http://localhost:6111',
    keyConfig: null,
    scope: 'live',
  }),
}))

const { UserMenu } = await import('../../components/UserMenu.js')

describe('UserMenu', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
    vi.clearAllMocks()
  })

  it('shows sign-in button when not authenticated', () => {
    render(<UserMenu />)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('uses custom sign-in text', () => {
    render(<UserMenu texts={{ signIn: 'Se connecter', signOut: 'Deconnexion', manageAccount: 'Mon compte' }} />)
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
  })

  it('renders dropdown trigger when authenticated', () => {
    const user = createTestUser({ firstName: 'Alice', lastName: 'Wonder' })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserMenu />)
    // Should show avatar with initials
    expect(screen.getByText('AW')).toBeInTheDocument()
  })

  it('renders extended variant with name and email', () => {
    const user = createTestUser({ firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com' })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserMenu variant="extended" />)
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('renders username when no first/last name', () => {
    const user = createTestUser({ firstName: undefined, lastName: undefined, username: 'cooluser' })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserMenu variant="extended" />)
    expect(screen.getByText('cooluser')).toBeInTheDocument()
  })
})
