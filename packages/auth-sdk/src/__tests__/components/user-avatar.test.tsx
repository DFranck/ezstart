import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { UserAvatar } from '../../components/UserAvatar.js'
import { createTestStore, TestAuthProvider } from '../testProvider.js'
import type { AuthStoreApi } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

function makeWrapper(store: AuthStoreApi) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestAuthProvider store={store}>{children}</TestAuthProvider>
  }
}

describe('UserAvatar', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('renders nothing when no user', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <UserAvatar />
      </Wrapper>
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders initials from firstName + lastName', () => {
    const user = createTestUser({ firstName: 'John', lastName: 'Doe' })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserAvatar />
      </Wrapper>
    )
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders initials from firstName only', () => {
    const user = createTestUser({ firstName: 'Alice', lastName: undefined })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserAvatar user={user} />
      </Wrapper>
    )
    expect(screen.getByText('AL')).toBeInTheDocument()
  })

  it('renders initials from username when no name', () => {
    const user = createTestUser({ firstName: undefined, lastName: undefined, username: 'bob42' })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserAvatar user={user} />
      </Wrapper>
    )
    expect(screen.getByText('BO')).toBeInTheDocument()
  })

  it('renders initials from email when no name or username', () => {
    const user = createTestUser({
      firstName: undefined,
      lastName: undefined,
      username: '',
      email: 'foo@bar.com',
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserAvatar user={user} />
      </Wrapper>
    )
    expect(screen.getByText('FO')).toBeInTheDocument()
  })

  it('renders avatar image when user has avatar URL', () => {
    const user = createTestUser({ avatar: 'https://example.com/avatar.jpg' })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserAvatar user={user} />
      </Wrapper>
    )
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer')
  })

  it('accepts size prop', () => {
    const user = createTestUser()
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <UserAvatar user={user} size="lg" />
      </Wrapper>
    )
    // lg = 'w-16 h-16 text-xl' — check the class is applied
    const el = container.firstElementChild
    expect(el?.className).toContain('w-16')
  })

  it('uses external user over auth state', () => {
    // Auth store has user A
    act(() => {
      store.getState().setAuth(createTestUser({ firstName: 'Store' }), 'tok')
    })
    // But we pass user B explicitly
    const externalUser = createTestUser({ firstName: 'External', lastName: 'User' })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <UserAvatar user={externalUser} />
      </Wrapper>
    )
    expect(screen.getByText('EU')).toBeInTheDocument()
  })
})
