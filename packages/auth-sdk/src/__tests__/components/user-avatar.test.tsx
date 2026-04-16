import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { useAuthStore } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

vi.mock('../../provider.js', () => ({
  useAuth: () => {
    const store = useAuthStore()
    return {
      user: store.user,
      isAuthenticated: store.isAuthenticated,
    }
  },
}))

const { UserAvatar } = await import('../../components/UserAvatar.js')

describe('UserAvatar', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('renders nothing when no user', () => {
    const { container } = render(<UserAvatar />)
    expect(container.innerHTML).toBe('')
  })

  it('renders initials from firstName + lastName', () => {
    const user = createTestUser({ firstName: 'John', lastName: 'Doe' })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })
    render(<UserAvatar />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders initials from firstName only', () => {
    const user = createTestUser({ firstName: 'Alice', lastName: undefined })
    render(<UserAvatar user={user} />)
    expect(screen.getByText('AL')).toBeInTheDocument()
  })

  it('renders initials from username when no name', () => {
    const user = createTestUser({ firstName: undefined, lastName: undefined, username: 'bob42' })
    render(<UserAvatar user={user} />)
    expect(screen.getByText('BO')).toBeInTheDocument()
  })

  it('renders initials from email when no name or username', () => {
    const user = createTestUser({
      firstName: undefined,
      lastName: undefined,
      username: '',
      email: 'foo@bar.com',
    })
    render(<UserAvatar user={user} />)
    expect(screen.getByText('FO')).toBeInTheDocument()
  })

  it('renders avatar image when user has avatar URL', () => {
    const user = createTestUser({ avatar: 'https://example.com/avatar.jpg' })
    render(<UserAvatar user={user} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer')
  })

  it('accepts size prop', () => {
    const user = createTestUser()
    const { container } = render(<UserAvatar user={user} size="lg" />)
    // lg = 'w-16 h-16 text-xl' — check the class is applied
    const el = container.firstElementChild
    expect(el?.className).toContain('w-16')
  })

  it('uses external user over auth state', () => {
    // Auth store has user A
    act(() => {
      useAuthStore.getState().setAuth(createTestUser({ firstName: 'Store' }), 'tok')
    })
    // But we pass user B explicitly
    const externalUser = createTestUser({ firstName: 'External', lastName: 'User' })
    render(<UserAvatar user={externalUser} />)
    expect(screen.getByText('EU')).toBeInTheDocument()
  })
})
