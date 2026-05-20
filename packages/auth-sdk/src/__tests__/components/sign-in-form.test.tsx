/**
 * SignInForm — regression test for the same-origin authorization-code
 * exchange path.
 *
 * Background: ezauth dogfoods its own admin section (e.g. `/en/admin`).
 * `/api/auth/login` only returns `{ code, expires_at }` — never tokens.
 * To obtain tokens the SDK must call `/api/auth/token` with the code.
 *
 * Bug 17 first fix shipped a same-origin "skip-the-callback" shortcut that
 * navigated straight to `redirectUri` WITHOUT exchanging the code first.
 * Result: destination page rendered with no tokens in the store, RequireAuth
 * flipped to unauthenticated, and the user bounced back to `/login` — an
 * infinite redirect loop (Bug 18).
 *
 * Fix: for same-origin redirects, exchange the code via `useAuth().handleCallback()`
 * (the same primitive `<AuthCallbackPage>` calls in the cross-origin flow)
 * BEFORE navigating. Cross-origin behaviour is unchanged — the consumer's
 * `/auth/callback` page handles the exchange.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiCall } from '@ezstart/api-sdk'

const mockApiCall = vi.mocked(apiCall)

const handleCallbackMock = vi.fn()

const useAuthState = {
  isAuthenticated: false,
  isAuthReady: false,
}

vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    handleCallback: handleCallbackMock,
    isAuthenticated: useAuthState.isAuthenticated,
    isAuthReady: useAuthState.isAuthReady,
  }),
}))

vi.mock('../../react/useAuthNavigation.js', () => ({
  useAuthNavigation: () => ({
    locale: 'en',
    forgotPasswordHref: '/en/forgot-password',
  }),
}))

// DevModeBanner is a presentational helper — render as an empty span so it
// does not pull in extra context that this test does not exercise.
vi.mock('../../components/DevModeBanner.js', () => ({
  DevModeBanner: () => null,
}))

vi.mock('../../components/OAuthButtons.js', () => ({
  OAuthButtons: () => null,
}))

vi.mock('../../components/themePreference.js', () => ({
  detectCurrentThemePreference: () => 'dark',
}))

// Bypass react-hook-form validation: this test exercises the post-submit
// logic (code exchange + navigation), not the form validation rules. The
// real form already requires non-empty fields, but with the FormField shim
// in setup.ts the inputs are not wired to react-hook-form state, so we
// short-circuit `handleSubmit` here to invoke the supplied callback with
// canned form values.
vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual<typeof import('react-hook-form')>('react-hook-form')
  return {
    ...actual,
    useForm: () => ({
      control: {},
      formState: { isValid: true },
      handleSubmit:
        (cb: (values: { email: string; password: string }) => unknown) =>
        (event?: { preventDefault?: () => void }) => {
          event?.preventDefault?.()
          return cb({ email: 'user@example.com', password: 'password123' })
        },
    }),
  }
})

// Stub `window.location.href` so we can assert post-login navigation.
const originalLocation = window.location

function setupLocation(origin: string): { hrefSet: { value: string | null } } {
  const hrefSet = { value: null as string | null }
  // Re-create a minimal Location-like object. JSDOM's Location is read-only,
  // so we delete and reassign through `Object.defineProperty`.
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      get href() {
        return hrefSet.value ?? `${origin}/en/login`
      },
      set href(next: string) {
        hrefSet.value = next
      },
      origin,
      pathname: '/en/login',
      search: '',
      hash: '',
      hostname: new URL(origin).hostname,
      protocol: new URL(origin).protocol,
      host: new URL(origin).host,
      port: new URL(origin).port,
    },
  })
  return { hrefSet }
}

function restoreLocation(): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  })
}

const { SignInForm } = await import('../../components/SignInForm.js')

describe('SignInForm — same-origin code exchange (Bug 18 regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    handleCallbackMock.mockReset()
    useAuthState.isAuthenticated = false
    useAuthState.isAuthReady = false
  })

  afterEach(() => {
    restoreLocation()
  })

  function submit(): void {
    // The mocked react-hook-form supplies canned values, so we only need to
    // dispatch the submit event on the form element.
    const form = document.querySelector('form')
    if (!form) throw new Error('SignInForm did not render a <form> element')
    fireEvent.submit(form)
  }

  it('exchanges the code via handleCallback BEFORE navigating same-origin', async () => {
    const { hrefSet } = setupLocation('http://localhost:6111')
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-same-origin' })
    handleCallbackMock.mockResolvedValueOnce({
      id: 'u1',
      email: 'user@example.com',
    })

    render(<SignInForm appName="ezauth" redirectUri="http://localhost:6111/en/admin" />)

    submit()

    await waitFor(() => {
      // PKCE (RFC 7636) — same-origin login mints a verifier and forwards it
      // to the exchange. The first arg is the code; the second is the verifier
      // (a 43-char base64url string).
      expect(handleCallbackMock).toHaveBeenCalledWith(
        'auth-code-same-origin',
        expect.stringMatching(/^[A-Za-z0-9\-_]{43}$/)
      )
    })
    // Navigation must happen AFTER the exchange resolved.
    await waitFor(() => {
      expect(hrefSet.value).toBe('http://localhost:6111/en/admin')
    })
  })

  it('sends a PKCE S256 challenge on /auth/login for same-origin redirects', async () => {
    setupLocation('http://localhost:6111')
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-pkce' })
    handleCallbackMock.mockResolvedValueOnce({ id: 'u1', email: 'user@example.com' })

    render(<SignInForm appName="ezauth" redirectUri="http://localhost:6111/en/admin" />)

    submit()

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({
          body: expect.objectContaining({
            code_challenge: expect.stringMatching(/^[A-Za-z0-9\-_]{43}$/),
            code_challenge_method: 'S256',
          }),
        })
      )
    })

    // The verifier forwarded to the exchange MUST be the SHA-256 preimage of
    // the challenge sent on login (proves the pair is consistent end-to-end).
    const { deriveCodeChallenge } = await import('../../core/pkce.js')
    const loginBody = mockApiCall.mock.calls[0]?.[1]?.body as {
      code_challenge: string
    }
    const exchangeVerifier = handleCallbackMock.mock.calls[0]?.[1] as string
    expect(await deriveCodeChallenge(exchangeVerifier)).toBe(loginBody.code_challenge)
  })

  it('does NOT send a PKCE challenge on cross-origin login (verifier cannot cross origins)', async () => {
    setupLocation('http://localhost:6111')
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-xo' })

    render(<SignInForm appName="ezpay" redirectUri="http://localhost:6131/en/auth/callback" />)

    submit()

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalled()
    })
    const body = mockApiCall.mock.calls[0]?.[1]?.body as Record<string, unknown>
    expect(body.code_challenge).toBeUndefined()
    expect(body.code_challenge_method).toBeUndefined()
  })

  it('does NOT call handleCallback on cross-origin redirects', async () => {
    const { hrefSet } = setupLocation('http://localhost:6111')
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-cross-origin' })

    render(<SignInForm appName="ezpay" redirectUri="http://localhost:6131/en/auth/callback" />)

    submit()

    await waitFor(() => {
      expect(hrefSet.value).toContain('http://localhost:6131/en/auth/callback')
    })
    expect(hrefSet.value).toContain('code=auth-code-cross-origin')
    expect(handleCallbackMock).not.toHaveBeenCalled()
  })

  it('surfaces an error and stays on the login page when same-origin exchange fails', async () => {
    const { hrefSet } = setupLocation('http://localhost:6111')
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-fail' })
    handleCallbackMock.mockRejectedValueOnce(new Error('Token exchange failed'))

    render(<SignInForm appName="ezauth" redirectUri="http://localhost:6111/en/admin" />)

    submit()

    await waitFor(() => {
      expect(handleCallbackMock).toHaveBeenCalledWith('auth-code-fail', expect.anything())
    })
    // Navigation must NOT have happened.
    expect(hrefSet.value).toBeNull()
    // Error message rendered.
    await waitFor(() => {
      expect(screen.getByText('Token exchange failed')).toBeInTheDocument()
    })
  })
})

/**
 * SignInForm — auto-redirect when already authenticated.
 *
 * Regression for LOGIN-PAGE-NO-REDIRECT-IF-AUTHED (#133): in cross-origin
 * setups the user can land on `/login` while their httpOnly cookie was not
 * visible to SSR (so `getServerAuth()` returned null) but their
 * localStorage carries a valid session from a previous visit. The store
 * rehydrates client-side with `isAuthenticated: true`. The form must
 * detect that and `window.location.replace()` to the dashboard instead of
 * sitting there with empty inputs.
 */
describe('SignInForm — auto-redirect when already authenticated', () => {
  let replaceMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    handleCallbackMock.mockReset()
    useAuthState.isAuthenticated = false
    useAuthState.isAuthReady = false
    replaceMock = vi.fn()
  })

  afterEach(() => {
    restoreLocation()
  })

  function setupLocationWithReplace(origin: string): void {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        href: `${origin}/en/login`,
        origin,
        pathname: '/en/login',
        search: '',
        hash: '',
        hostname: new URL(origin).hostname,
        protocol: new URL(origin).protocol,
        host: new URL(origin).host,
        port: new URL(origin).port,
        replace: replaceMock,
        assign: vi.fn(),
      },
    })
  }

  it('does NOT redirect while auth state is still hydrating (isAuthReady=false)', async () => {
    setupLocationWithReplace('http://localhost:6111')
    useAuthState.isAuthenticated = true
    useAuthState.isAuthReady = false

    render(<SignInForm appName="ezauth" />)

    // Effect runs but bails early: replace must not be called.
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('does NOT redirect when the user is unauthenticated', async () => {
    setupLocationWithReplace('http://localhost:6111')
    useAuthState.isAuthenticated = false
    useAuthState.isAuthReady = true

    render(<SignInForm appName="ezauth" />)

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(replaceMock).not.toHaveBeenCalled()
    // The form is still rendered for the user to type credentials.
    expect(document.querySelector('form')).not.toBeNull()
  })

  it('redirects to the same-origin /{locale}/dashboard default when authenticated', async () => {
    setupLocationWithReplace('http://localhost:6111')
    useAuthState.isAuthenticated = true
    useAuthState.isAuthReady = true

    render(<SignInForm appName="ezauth" />)

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('http://localhost:6111/en/dashboard')
    })
  })

  it('honours an explicit same-origin `redirectUri` prop (no SSO handoff needed)', async () => {
    setupLocationWithReplace('http://localhost:6111')
    useAuthState.isAuthenticated = true
    useAuthState.isAuthReady = true

    render(<SignInForm appName="ezauth" redirectUri="http://localhost:6111/admin" />)

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('http://localhost:6111/admin')
    })
  })

  it('cross-origin redirectUri triggers SSO handoff (POST /auth/sso/authorize, redirects with ?code=)', async () => {
    setupLocationWithReplace('http://localhost:6111')
    useAuthState.isAuthenticated = true
    useAuthState.isAuthReady = true
    mockApiCall.mockResolvedValueOnce({ code: 'sso-code-xyz', expiresIn: 60 })

    render(<SignInForm appName="ezauth" redirectUri="https://app.example.com/admin" />)

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        '/auth/sso/authorize',
        expect.objectContaining({
          method: 'POST',
          body: { app: 'ezauth', redirectUri: 'https://app.example.com/admin' },
        })
      )
    })
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('https://app.example.com/admin?code=sso-code-xyz')
    })
  })
})
