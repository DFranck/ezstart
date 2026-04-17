import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { useAuthStore } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

vi.mock('../../react/hooks.js', () => ({
  useAuth: () => {
    const store = useAuthStore()
    return {
      user: store.user,
      isAuthenticated: store.isAuthenticated,
      isAuthReady: true,
    }
  },
}))

const { UserSettings } = await import('../../components/UserSettings.js')

describe('UserSettings', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('renders nothing when not authenticated', () => {
    const { container } = render(<UserSettings />)
    expect(container.innerHTML).toBe('')
  })

  it('renders user info when authenticated', () => {
    const user = createTestUser({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      username: 'johndoe',
      createdAt: '2024-01-15T00:00:00.000Z',
    })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserSettings />)
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    // "johndoe" appears as @johndoe in the header and as value in the info row
    expect(screen.getAllByText('johndoe').length).toBeGreaterThanOrEqual(1)
    // "John Doe" appears in the header H2 and in the Full Name info row
    expect(screen.getAllByText('John Doe').length).toBe(2)
  })

  it('renders avatar when showAvatar=true (default)', () => {
    const user = createTestUser({ firstName: 'A', lastName: 'B' })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserSettings />)
    // Avatar renders initials "AB"
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('hides email when showEmail=false', () => {
    const user = createTestUser({ email: 'hidden@example.com' })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserSettings showEmail={false} />)
    expect(screen.queryByText('hidden@example.com')).not.toBeInTheDocument()
  })

  it('renders roles when user has roles', () => {
    const user = createTestUser({
      globalRoles: ['superadmin'],
      appRoles: { myapp: ['admin'] },
    })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserSettings appName="myapp" />)
    expect(screen.getByText('superadmin')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('shows connected accounts section by default', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserSettings />)
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('hides connected accounts when showConnectedAccounts=false', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserSettings showConnectedAccounts={false} />)
    expect(screen.queryByText('Connected Accounts')).not.toBeInTheDocument()
  })

  it('uses custom texts', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(
      <UserSettings
        texts={{
          personalInfo: 'Informations personnelles',
          email: 'Courriel',
        }}
      />
    )
    expect(screen.getByText('Informations personnelles')).toBeInTheDocument()
    expect(screen.getByText('Courriel')).toBeInTheDocument()
  })

  it('shows Google connected for googleusercontent avatars', () => {
    const user = createTestUser({
      avatar: 'https://lh3.googleusercontent.com/photo.jpg',
    })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserSettings />)
    // Email appears in the info row AND in the connected account section
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThanOrEqual(2)
    // Should NOT show "Not connected"
    expect(screen.queryByText('Not connected')).not.toBeInTheDocument()
  })

  it('shows Not connected for non-Google avatars', () => {
    const user = createTestUser({ avatar: undefined })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(<UserSettings />)
    expect(screen.getByText('Not connected')).toBeInTheDocument()
  })
})
