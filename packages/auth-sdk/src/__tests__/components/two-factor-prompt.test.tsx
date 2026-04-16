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
    expect(
      screen.getByText('Enter the code from your authenticator app')
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
  })

  it('disables verify button when code is too short', () => {
    render(<TwoFactorPrompt tempToken="temp-tok-123" />)
    const btn = screen.getByText('Verify')
    expect(btn).toBeDisabled()
  })

  it('enables verify button when code is 6+ chars', () => {
    render(<TwoFactorPrompt tempToken="temp-tok-123" />)
    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '123456' } })
    const btn = screen.getByText('Verify')
    expect(btn).not.toBeDisabled()
  })

  it('calls apiCall on submit and redirects when redirectUri is set', async () => {
    mockApiCall.mockResolvedValueOnce({ code: 'auth-code-xyz' })

    render(
      <TwoFactorPrompt
        tempToken="temp-tok-123"
        redirectUri="https://app.example.com/callback"
      />
    )

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '123456' } })

    const form = input.closest('form')!
    fireEvent.submit(form)

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

    render(
      <TwoFactorPrompt tempToken="temp-tok" onSuccess={onSuccess} />
    )

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '654321' } })

    const form = input.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ code: 'xyz' })
    })
  })

  it('shows error message on API failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Invalid code'))

    render(<TwoFactorPrompt tempToken="temp-tok" />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '000000' } })

    const form = input.closest('form')!
    fireEvent.submit(form)

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
