import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { UserMenu } from '../../components/UserMenu.js'
import { createTestStore, TestAuthProvider } from '../testProvider.js'
import type { AuthStoreApi } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

function makeWrapper(store: AuthStoreApi) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestAuthProvider store={store}>{children}</TestAuthProvider>
  }
}

describe('UserMenu', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('shows sign-in button when not authenticated', () => {
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserMenu />
      </Wrapper>
    )
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('uses custom sign-in text', () => {
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserMenu
          texts={{ signIn: 'Se connecter', signOut: 'Deconnexion', manageAccount: 'Mon compte' }}
        />
      </Wrapper>
    )
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
  })

  it('renders dropdown trigger when authenticated', () => {
    const user = createTestUser({ firstName: 'Alice', lastName: 'Wonder' })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserMenu />
      </Wrapper>
    )
    // Should show avatar with initials
    expect(screen.getByText('AW')).toBeInTheDocument()
  })

  it('renders extended variant with name and email', () => {
    const user = createTestUser({ firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com' })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserMenu variant="extended" />
      </Wrapper>
    )
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('renders username when no first/last name', () => {
    const user = createTestUser({ firstName: undefined, lastName: undefined, username: 'cooluser' })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserMenu variant="extended" />
      </Wrapper>
    )
    expect(screen.getByText('cooluser')).toBeInTheDocument()
  })
})
