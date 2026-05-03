import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { apiCall } from '@ezstart/api-sdk'
import { TwoFactorPrompt } from '../../components/TwoFactorPrompt.js'

const mockApiCall = vi.mocked(apiCall)
const handleCallbackMock = vi.fn()

vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    handleCallback: handleCallbackMock,
  }),
}))

// Capture the value passed to `window.location.href` so we can assert
// redirect target without actually navigating.
let lastHref = ''
beforeEach(() => {
  lastHref = ''
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      origin: 'http://localhost:6111',
      get href() {
        return lastHref
      },
      set href(v: string) {
        lastHref = v
      },
    },
  })
})

describe('TwoFactorPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    handleCallbackMock.mockReset()
    handleCallbackMock.mockResolvedValue({ id: 'user-1', email: 'u@example.com' })
  })

  it('renders prompt text and code input', () => {
    render(<TwoFactorPrompt tempToken="temp-tok-123" />)
    expect(screen.getByText('Enter the code from your authenticator app')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
  })

  it('disables verify button when code is too short', () => {
    render(<TwoFactorPrompt tempToken="temp-tok-123" />)
    const btn = screen.getByText('Verify')
    expect(btn).toBeDisabled()
  })

  it('auto-submits when a 6-digit TOTP code is entered (no manual click)', async () => {
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-auto' })
    const onSuccess = vi.fn()

    render(<TwoFactorPrompt tempToken="temp-tok-auto" onSuccess={onSuccess} />)
    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '123456' } })

    // No fireEvent.submit() — auto-submit must fire on its own
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('/auth/2fa/validate', {
        appName: 'ezauth',
        method: 'POST',
        body: { tempToken: 'temp-tok-auto', code: '123456' },
      })
    })
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ code: 'auth-code-auto' })
    })
  })

  it('does NOT auto-submit for backup codes (8 hex chars require explicit click)', async () => {
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-backup' })

    render(<TwoFactorPrompt tempToken="temp-tok-backup" />)
    const input = screen.getByPlaceholderText('000000')
    // Backup code = 8 hex chars
    fireEvent.change(input, { target: { value: 'a1b2c3d4' } })

    // Wait a tick to confirm no auto-submit fired
    await new Promise(r => setTimeout(r, 50))
    expect(mockApiCall).not.toHaveBeenCalled()

    // Now click Verify explicitly
    const btn = screen.getByText('Verify')
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('/auth/2fa/validate', {
        appName: 'ezauth',
        method: 'POST',
        body: { tempToken: 'temp-tok-backup', code: 'a1b2c3d4' },
      })
    })
  })

  it('calls apiCall on submit and redirects when redirectUri is set', async () => {
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-xyz' })

    render(
      <TwoFactorPrompt tempToken="temp-tok-123" redirectUri="https://app.example.com/callback" />
    )

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '123456' } })

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('/auth/2fa/validate', {
        appName: 'ezauth',
        method: 'POST',
        body: { tempToken: 'temp-tok-123', code: '123456' },
      })
    })
  })

  it('calls onSuccess when no redirectUri', async () => {
    const onSuccess = vi.fn()
    mockApiCall.mockResolvedValueOnce({ code: 'xyz' })

    render(<TwoFactorPrompt tempToken="temp-tok" onSuccess={onSuccess} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '654321' } })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ code: 'xyz' })
    })
  })

  it('shows error message on API failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Invalid code'))

    render(<TwoFactorPrompt tempToken="temp-tok" />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '000000' } })

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument()
    })
  })

  it('renders back button when onBack is provided', () => {
    const onBack = vi.fn()
    render(<TwoFactorPrompt tempToken="temp-tok" onBack={onBack} />)
    const backBtn = screen.getByText('Back to login')
    expect(backBtn).toBeInTheDocument()
    fireEvent.click(backBtn)
    expect(onBack).toHaveBeenCalled()
  })

  it('does NOT render back button when onBack is not provided', () => {
    render(<TwoFactorPrompt tempToken="temp-tok" />)
    expect(screen.queryByText('Back to login')).not.toBeInTheDocument()
  })

  it('supports custom texts', () => {
    render(
      <TwoFactorPrompt
        tempToken="temp-tok"
        texts={{
          prompt: 'Entrez le code 2FA',
          verify: 'Valider',
        }}
      />
    )
    expect(screen.getByText('Entrez le code 2FA')).toBeInTheDocument()
    expect(screen.getByText('Valider')).toBeInTheDocument()
  })

  // ─── Bug 18 parity — same-origin code exchange before navigation ───────
  // Mirror of `sign-in-form.test.tsx` "exchanges the code via handleCallback
  // BEFORE navigating same-origin". Without this, the destination page
  // (e.g. `/en/admin`) loads with an empty store, RequireAuth bounces back
  // to /login, infinite redirect loop.
  it('exchanges the code via handleCallback BEFORE same-origin navigation', async () => {
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-same-origin' })

    render(
      <TwoFactorPrompt
        tempToken="temp-tok-same"
        // Same origin as the mocked window.location (http://localhost:6111)
        redirectUri="http://localhost:6111/en/admin"
      />
    )
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } })

    await waitFor(() => {
      expect(handleCallbackMock).toHaveBeenCalledWith('auth-code-same-origin')
    })
    await waitFor(() => {
      expect(lastHref).toBe('http://localhost:6111/en/admin')
    })
  })

  it('forwards code via SSO redirect for cross-origin redirectUri (no exchange)', async () => {
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-cross' })

    render(
      <TwoFactorPrompt
        tempToken="temp-tok-cross"
        // Different origin (port mismatch = different origin per browser)
        redirectUri="http://localhost:6131/en/auth/callback"
      />
    )
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '654321' } })

    await waitFor(() => {
      // Cross-origin redirect must happen
      expect(lastHref).toContain('http://localhost:6131/en/auth/callback')
      expect(lastHref).toContain('code=auth-code-cross')
    })
    // Critical: handleCallback NEVER called for cross-origin (the consumer's
    // /auth/callback page exchanges the code itself).
    expect(handleCallbackMock).not.toHaveBeenCalled()
  })

  it('hard ref-guard prevents double-fire (StrictMode + auto+manual race)', async () => {
    // Slow apiCall → simulate a real network round-trip so a second call
    // attempt can fire before the first resolves.
    let resolveApi: (v: unknown) => void = () => {}
    mockApiCall.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveApi = resolve
        })
    )

    render(<TwoFactorPrompt tempToken="temp-tok-race" />)
    const input = screen.getByPlaceholderText('000000')

    // Trigger auto-submit (effect fires synchronously after the state change)
    fireEvent.change(input, { target: { value: '123456' } })

    // Immediately try a manual submit too (form submit event). The hard
    // submittingRef guard MUST short-circuit it before apiCall runs again.
    const form = input.closest('form')!
    fireEvent.submit(form)

    // Resolve the in-flight call so we can flush effects deterministically.
    resolveApi({ code: 'race-code' })

    // EXACTLY 1 call should have made it through.
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1)
    })
  })
})
