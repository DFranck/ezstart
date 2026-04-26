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

vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    handleCallback: handleCallbackMock,
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
      expect(handleCallbackMock).toHaveBeenCalledWith('auth-code-same-origin')
    })
    // Navigation must happen AFTER the exchange resolved.
    await waitFor(() => {
      expect(hrefSet.value).toBe('http://localhost:6111/en/admin')
    })
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
      expect(handleCallbackMock).toHaveBeenCalledWith('auth-code-fail')
    })
    // Navigation must NOT have happened.
    expect(hrefSet.value).toBeNull()
    // Error message rendered.
    await waitFor(() => {
      expect(screen.getByText('Token exchange failed')).toBeInTheDocument()
    })
  })
})
