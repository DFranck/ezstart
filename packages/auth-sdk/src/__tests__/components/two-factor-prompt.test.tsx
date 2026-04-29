import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { apiCall } from '@ezstart/api-sdk'
import { TwoFactorPrompt } from '../../components/TwoFactorPrompt.js'

const mockApiCall = vi.mocked(apiCall)

describe('TwoFactorPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
