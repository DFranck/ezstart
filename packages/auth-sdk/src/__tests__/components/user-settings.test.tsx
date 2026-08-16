import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { UserSettings } from '../../components/UserSettings.js'
import { createTestStore, TestAuthProvider } from '../testProvider.js'
import type { AuthStoreApi } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

function makeWrapper(store: AuthStoreApi) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestAuthProvider store={store}>{children}</TestAuthProvider>
  }
}

describe('UserSettings', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('renders nothing when not authenticated', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <UserSettings />
      </Wrapper>
    )
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
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings />
      </Wrapper>
    )
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    // "johndoe" appears as @johndoe in the header and as value in the info row
    expect(screen.getAllByText('johndoe').length).toBeGreaterThanOrEqual(1)
    // "John Doe" appears in the header H2 and in the Full Name info row
    expect(screen.getAllByText('John Doe').length).toBe(2)
  })

  it('renders avatar when showAvatar=true (default)', () => {
    const user = createTestUser({ firstName: 'A', lastName: 'B' })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings />
      </Wrapper>
    )
    // Avatar renders initials "AB"
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('hides email when showEmail=false', () => {
    const user = createTestUser({ email: 'hidden@example.com' })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings showEmail={false} />
      </Wrapper>
    )
    expect(screen.queryByText('hidden@example.com')).not.toBeInTheDocument()
  })

  it('renders roles when user has roles', () => {
    const user = createTestUser({
      globalRoles: ['superadmin'],
      appRoles: { myapp: ['admin'] },
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings appName="myapp" />
      </Wrapper>
    )
    expect(screen.getByText('superadmin')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('shows connected accounts section by default', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings />
      </Wrapper>
    )
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('hides connected accounts when showConnectedAccounts=false', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings showConnectedAccounts={false} />
      </Wrapper>
    )
    expect(screen.queryByText('Connected Accounts')).not.toBeInTheDocument()
  })

  it('uses custom texts', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings
          texts={{
            personalInfo: 'Informations personnelles',
            email: 'Courriel',
          }}
        />
      </Wrapper>
    )
    expect(screen.getByText('Informations personnelles')).toBeInTheDocument()
    expect(screen.getByText('Courriel')).toBeInTheDocument()
  })

  it('shows Google connected for googleusercontent avatars', () => {
    const user = createTestUser({
      avatar: 'https://lh3.googleusercontent.com/photo.jpg',
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings />
      </Wrapper>
    )
    // Email appears in the info row AND in the connected account section
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThanOrEqual(2)
    // Should NOT show "Not connected"
    expect(screen.queryByText('Not connected')).not.toBeInTheDocument()
  })

  it('shows Not connected for non-Google avatars', () => {
    const user = createTestUser({ avatar: undefined })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserSettings />
      </Wrapper>
    )
    expect(screen.getByText('Not connected')).toBeInTheDocument()
  })
})
