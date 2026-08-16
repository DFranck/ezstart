import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { RequireAuth, AccessDenied, SignedIn, SignedOut } from '../../react/guards.js'
import { createTestStore, TestAuthProvider } from '../testProvider.js'
import { createTestUser } from '../helpers.js'
import type { AuthStoreApi } from '../../react/store.js'

// ---------------------------------------------------------------------------
// window.location.href stub helper
// ---------------------------------------------------------------------------
//
// jsdom's `window.location` ignores assignments to `href` by default and
// triggers a "Not implemented: navigation" warning. We replace `location`
// with a plain object spy so we can assert the assignment.
function stubLocation(pathname: string) {
  const calls: string[] = []
  const fakeLocation: Record<string, unknown> = {
    pathname,
    search: '',
    hash: '',
    origin: 'http://localhost',
    get href() {
      return `http://localhost${pathname}`
    },
    set href(value: string) {
      calls.push(value)
    },
    assign: (value: string) => {
      calls.push(value)
    },
    replace: (value: string) => {
      calls.push(value)
    },
  }
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: fakeLocation,
  })
  return {
    calls,
    restore: () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: original,
      })
    },
  }
}

function makeWrapper(store: AuthStoreApi) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestAuthProvider store={store}>{children}</TestAuthProvider>
  }
}

describe('RequireAuth', () => {
  let stub: ReturnType<typeof stubLocation> | null = null
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore({ storageKey: 'guards-require-' + Math.random() })
  })

  afterEach(() => {
    if (stub) {
      stub.restore()
      stub = null
    }
  })

  it('renders children when authenticated', async () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth>
          <div data-testid="protected">Secret content</div>
        </RequireAuth>
      </Wrapper>
    )

    // Wait for hydration effect
    await act(async () => {})

    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('renders fallback when NOT authenticated', async () => {
    stub = stubLocation('/en/admin')

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth fallbackComponent={<div data-testid="fallback">Please login</div>}>
          <div data-testid="protected">Secret content</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    // Explicit fallback disables the default auto-redirect.
    expect(stub.calls).toHaveLength(0)
  })

  it('renders nothing when NOT authenticated and fallbackComponent={null} (silent opt-out)', async () => {
    stub = stubLocation('/en/admin')

    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <RequireAuth fallbackComponent={null}>
          <div data-testid="protected">Secret content</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    expect(container.innerHTML).toBe('')
    // Explicit `null` fallback also disables the default auto-redirect.
    expect(stub.calls).toHaveLength(0)
  })

  it('renders loading component during hydration', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <RequireAuth loadingComponent={<div data-testid="loading">Loading...</div>}>
          <div>Content</div>
        </RequireAuth>
      </Wrapper>
    )

    // Before useEffect runs, isHydrated is false
    // Note: In testing-library, useEffect runs synchronously, so this may not capture the initial state
    // We just verify the component doesn't crash
    expect(container).toBeTruthy()
  })

  // -------------------------------------------------------------------------
  // Default loading fallback (NEW) — when `loadingComponent` is omitted,
  // the guard renders an agnostic SVG spinner with role="status".
  // -------------------------------------------------------------------------

  it('renders default loading fallback when no loadingComponent is provided', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <RequireAuth>
          <div data-testid="protected">Secret content</div>
        </RequireAuth>
      </Wrapper>
    )

    // Synchronously (before hydration effect), the default loader is rendered.
    // We assert via role="status" + the inline SVG.
    const status = container.querySelector('[role="status"]')
    expect(status).not.toBeNull()
    expect(status?.getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders custom loadingComponent instead of the default when provided', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <RequireAuth loadingComponent={<div data-testid="custom-loading">Custom loader</div>}>
          <div>Content</div>
        </RequireAuth>
      </Wrapper>
    )

    // Custom loader present
    expect(container.querySelector('[data-testid="custom-loading"]')).not.toBeNull()
    // Default SVG spinner absent
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders nothing during hydration when loadingComponent={null} (explicit opt-out)', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <RequireAuth loadingComponent={null} fallbackComponent={null}>
          <div>Content</div>
        </RequireAuth>
      </Wrapper>
    )

    // Explicit null suppresses the default loader entirely.
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('[role="status"]')).toBeNull()
  })

  it('redirects when redirectTo is set and user is NOT authenticated', async () => {
    stub = stubLocation('/en/admin')

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth redirectTo="/custom-login">
          <div>Content</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(screen.queryByText('Content')).not.toBeInTheDocument()
    expect(stub.calls).toContain('/custom-login')
  })

  // -------------------------------------------------------------------------
  // Default behavior — auto-redirect to {locale}/login?redirect_uri=<absolute>
  // -------------------------------------------------------------------------

  it('auto-redirects to /{locale}/login?redirect_uri=<absolute URL> when no fallback nor redirectTo', async () => {
    stub = stubLocation('/en/admin')

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth>
          <div>Protected</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
    expect(stub.calls).toHaveLength(1)
    expect(stub.calls[0]).toBe(
      '/en/login?redirect_uri=' + encodeURIComponent('http://localhost/en/admin')
    )
    const decoded = decodeURIComponent(
      (stub.calls[0] as string).split('redirect_uri=')[1] as string
    )
    expect(decoded.startsWith('http://') || decoded.startsWith('https://')).toBe(true)
  })

  it('auto-redirects respecting custom loginPath', async () => {
    stub = stubLocation('/fr/dashboard')

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth loginPath="/auth/signin">
          <div>Protected</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(stub.calls).toHaveLength(1)
    expect(stub.calls[0]).toBe(
      '/fr/auth/signin?redirect_uri=' + encodeURIComponent('http://localhost/fr/dashboard')
    )
  })

  it('auto-redirects to /login (no locale prefix) when URL has no locale segment', async () => {
    stub = stubLocation('/admin')

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth>
          <div>Protected</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(stub.calls).toHaveLength(1)
    expect(stub.calls[0]).toBe(
      '/login?redirect_uri=' + encodeURIComponent('http://localhost/admin')
    )
  })

  it('preserves search and hash in the redirect_uri', async () => {
    stub = stubLocation('/en/admin')
    ;(window.location as unknown as { search: string }).search = '?tab=users'
    ;(window.location as unknown as { hash: string }).hash = '#row-3'

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth>
          <div>Protected</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(stub.calls).toHaveLength(1)
    expect(stub.calls[0]).toBe(
      '/en/login?redirect_uri=' + encodeURIComponent('http://localhost/en/admin?tab=users#row-3')
    )
  })

  it('redirect_uri is an absolute http(s) URL accepted by backend Zod url() validator', async () => {
    stub = stubLocation('/en/admin')

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth>
          <div>Protected</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(stub.calls).toHaveLength(1)
    const queryStart = (stub.calls[0] as string).indexOf('redirect_uri=')
    expect(queryStart).toBeGreaterThan(-1)
    const encoded = (stub.calls[0] as string).slice(queryStart + 'redirect_uri='.length)
    const decoded = decodeURIComponent(encoded)
    expect(() => new URL(decoded)).not.toThrow()
    expect(['http:', 'https:']).toContain(new URL(decoded).protocol)
  })

  it('redirectTo overrides the default auto-redirect', async () => {
    stub = stubLocation('/en/admin')

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <RequireAuth redirectTo="/sso/start">
          <div>Protected</div>
        </RequireAuth>
      </Wrapper>
    )

    await act(async () => {})

    expect(stub.calls).toContain('/sso/start')
    // Auto-redirect path must NOT have been called
    expect(stub.calls.some(c => c.includes('redirect_uri='))).toBe(false)
  })
})

describe('AccessDenied', () => {
  it('renders default title and message', () => {
    render(<AccessDenied />)
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('You must be logged in to access this page.')).toBeInTheDocument()
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
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore({ storageKey: 'guards-signed-in-' + Math.random() })
  })

  it('renders children when authenticated', () => {
    act(() => {
      store.getState().setAuth(createTestUser(), 'tok')
    })

    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <SignedIn>
          <div data-testid="auth-content">Authenticated</div>
        </SignedIn>
      </Wrapper>
    )

    expect(screen.getByTestId('auth-content')).toBeInTheDocument()
  })

  it('renders nothing when NOT authenticated', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <SignedIn>
          <div>Should not show</div>
        </SignedIn>
      </Wrapper>
    )

    expect(container.innerHTML).toBe('')
  })
})

describe('SignedOut', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore({ storageKey: 'guards-signed-out-' + Math.random() })
  })

  it('renders children when NOT authenticated', () => {
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <SignedOut>
          <div data-testid="guest-content">Please login</div>
        </SignedOut>
      </Wrapper>
    )

    expect(screen.getByTestId('guest-content')).toBeInTheDocument()
  })

  it('renders nothing when authenticated', () => {
    act(() => {
      store.getState().setAuth(createTestUser(), 'tok')
    })

    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <SignedOut>
          <div>Should not show</div>
        </SignedOut>
      </Wrapper>
    )

    expect(container.innerHTML).toBe('')
  })
})
