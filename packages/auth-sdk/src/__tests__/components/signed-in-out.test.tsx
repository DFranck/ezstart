import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { useAuthStore } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

// Mock the provider that SignedIn/SignedOut use
vi.mock('../../provider.js', () => ({
  useAuth: () => {
    const store = useAuthStore()
    return {
      user: store.user,
      isAuthenticated: store.isAuthenticated,
    }
  },
}))

const { SignedIn } = await import('../../components/SignedIn.js')
const { SignedOut } = await import('../../components/SignedOut.js')

describe('SignedIn (component layer)', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('renders children when authenticated', () => {
    act(() => {
      useAuthStore.getState().setAuth(createTestUser(), 'tok')
    })
    render(
      <SignedIn>
        <span data-testid="inner">Visible</span>
      </SignedIn>
    )
    expect(screen.getByTestId('inner')).toBeInTheDocument()
  })

  it('renders nothing when NOT authenticated', () => {
    const { container } = render(
      <SignedIn>
        <span>Hidden</span>
      </SignedIn>
    )
    expect(container.innerHTML).toBe('')
  })
})

describe('SignedOut (component layer)', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('renders children when NOT authenticated', () => {
    render(
      <SignedOut>
        <span data-testid="guest">Login please</span>
      </SignedOut>
    )
    expect(screen.getByTestId('guest')).toBeInTheDocument()
  })

  it('renders nothing when authenticated', () => {
    act(() => {
      useAuthStore.getState().setAuth(createTestUser(), 'tok')
    })
    const { container } = render(
      <SignedOut>
        <span>Hidden</span>
      </SignedOut>
    )
    expect(container.innerHTML).toBe('')
  })
})
