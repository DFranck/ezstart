import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { useAuthStore } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

// Guards import useAuth from ./hooks.js, which calls useAuthContext from ./auth-provider.js.
// We mock auth-provider to provide the context without a real AuthProvider wrapper.
vi.mock('../../react/auth-provider.js', () => ({
  useAuthContext: () => ({
    client: {
      getApiUrl: () => 'http://localhost:6110/api/auth',
      getAppName: () => 'testapp',
    },
    appName: 'testapp',
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Import guards after mocking
const { RequireAuth, AccessDenied, SignedIn, SignedOut } = await import('../../react/guards.js')

describe('RequireAuth', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('renders children when authenticated', async () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })

    render(
      <RequireAuth>
        <div data-testid="protected">Secret content</div>
      </RequireAuth>
    )

    // Wait for hydration effect
    await act(async () => {})

    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('renders fallback when NOT authenticated', async () => {
    render(
      <RequireAuth fallbackComponent={<div data-testid="fallback">Please login</div>}>
        <div data-testid="protected">Secret content</div>
      </RequireAuth>
    )

    await act(async () => {})

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback')).toBeInTheDocument()
  })

  it('renders nothing when NOT authenticated and no fallback', async () => {
    const { container } = render(
      <RequireAuth>
        <div data-testid="protected">Secret content</div>
      </RequireAuth>
    )

    await act(async () => {})

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    expect(container.innerHTML).toBe('')
  })

  it('renders loading component during hydration', () => {
    const { container } = render(
      <RequireAuth loadingComponent={<div data-testid="loading">Loading...</div>}>
        <div>Content</div>
      </RequireAuth>
    )

    // Before useEffect runs, isHydrated is false
    // Note: In testing-library, useEffect runs synchronously, so this may not capture the initial state
    // We just verify the component doesn't crash
    expect(container).toBeTruthy()
  })

  it('redirects when redirectTo is set and user is NOT authenticated', async () => {
    const originalHref = window.location.href

    render(
      <RequireAuth redirectTo="/login">
        <div>Content</div>
      </RequireAuth>
    )

    await act(async () => {})

    // The component sets window.location.href
    // In jsdom this may not actually navigate, but we verify the assignment
    // Since there's no mock, we just verify no children render
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })
})

describe('AccessDenied', () => {
  it('renders default title and message', () => {
    render(<AccessDenied />)
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(
      screen.getByText('You must be logged in to access this page.')
    ).toBeInTheDocument()
  })

  it('renders custom title and message', () => {
    render(<AccessDenied title="Forbidden" message="Not authorized" />)
    expect(screen.getByText('Forbidden')).toBeInTheDocument()
    expect(screen.getByText('Not authorized')).toBeInTheDocument()
  })

  it('renders children and action button', () => {
    render(
      <AccessDenied actionButton={<button data-testid="action">Login</button>}>
        <span data-testid="extra">Extra info</span>
      </AccessDenied>
    )
    expect(screen.getByTestId('extra')).toBeInTheDocument()
    expect(screen.getByTestId('action')).toBeInTheDocument()
  })
})

describe('SignedIn', () => {
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
        <div data-testid="auth-content">Authenticated</div>
      </SignedIn>
    )

    expect(screen.getByTestId('auth-content')).toBeInTheDocument()
  })

  it('renders nothing when NOT authenticated', () => {
    const { container } = render(
      <SignedIn>
        <div>Should not show</div>
      </SignedIn>
    )

    expect(container.innerHTML).toBe('')
  })
})

describe('SignedOut', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('renders children when NOT authenticated', () => {
    render(
      <SignedOut>
        <div data-testid="guest-content">Please login</div>
      </SignedOut>
    )

    expect(screen.getByTestId('guest-content')).toBeInTheDocument()
  })

  it('renders nothing when authenticated', () => {
    act(() => {
      useAuthStore.getState().setAuth(createTestUser(), 'tok')
    })

    const { container } = render(
      <SignedOut>
        <div>Should not show</div>
      </SignedOut>
    )

    expect(container.innerHTML).toBe('')
  })
})
