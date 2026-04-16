import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { apiCall } from '@ezstart/api-sdk'
import { TwoFactorSettings } from '../../components/TwoFactorSettings.js'

const mockApiCall = vi.mocked(apiCall)

describe('TwoFactorSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows spinner while loading 2FA status', () => {
    // Never resolves
    mockApiCall.mockReturnValue(new Promise(() => {}))
    render(<TwoFactorSettings />)
    expect(screen.getByTestId('Spinner')).toBeInTheDocument()
  })

  it('shows enable button when 2FA is disabled', async () => {
    mockApiCall.mockResolvedValueOnce({ isEnabled: false })

    render(<TwoFactorSettings />)

    await waitFor(() => {
      expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
    })
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('shows disable button when 2FA is enabled', async () => {
    mockApiCall.mockResolvedValueOnce({ isEnabled: true })

    render(<TwoFactorSettings />)

    await waitFor(() => {
      expect(screen.getByText('Disable 2FA')).toBeInTheDocument()
    })
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('starts setup flow when Enable 2FA is clicked', async () => {
    // First: status check
    mockApiCall.mockResolvedValueOnce({ isEnabled: false })
    // Second: setup call
    mockApiCall.mockResolvedValueOnce({
      qrCode: 'data:image/png;base64,abc',
      secret: 'JBSWY3DPEHPK3PXP',
    })

    render(<TwoFactorSettings />)

    await waitFor(() => {
      expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enable 2FA'))

    await waitFor(() => {
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    })
    expect(screen.getByText('Verify & Enable')).toBeDisabled()
  })

  it('shows backup codes after successful verification', async () => {
    mockApiCall.mockResolvedValueOnce({ isEnabled: false })
    mockApiCall.mockResolvedValueOnce({
      qrCode: 'data:image/png;base64,abc',
      secret: 'SECRET123',
    })
    mockApiCall.mockResolvedValueOnce({
      backupCodes: ['code-1', 'code-2', 'code-3'],
    })

    const onStatusChange = vi.fn()
    render(<TwoFactorSettings onStatusChange={onStatusChange} />)

    await waitFor(() => {
      expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enable 2FA'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('000000'), {
      target: { value: '123456' },
    })

    fireEvent.click(screen.getByText('Verify & Enable'))

    await waitFor(() => {
      expect(screen.getByText('code-1')).toBeInTheDocument()
      expect(screen.getByText('code-2')).toBeInTheDocument()
    })

    expect(onStatusChange).toHaveBeenCalledWith(true)
  })

  it('shows error on failed verification', async () => {
    mockApiCall.mockResolvedValueOnce({ isEnabled: false })
    mockApiCall.mockResolvedValueOnce({
      qrCode: 'data:image/png;base64,abc',
      secret: 'SECRET123',
    })
    mockApiCall.mockRejectedValueOnce(new Error('Invalid verification code'))

    render(<TwoFactorSettings />)

    await waitFor(() => {
      expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enable 2FA'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('000000'), {
      target: { value: '999999' },
    })

    fireEvent.click(screen.getByText('Verify & Enable'))

    await waitFor(() => {
      expect(screen.getByText('Invalid verification code')).toBeInTheDocument()
    })
  })

  it('can cancel setup flow', async () => {
    mockApiCall.mockResolvedValueOnce({ isEnabled: false })
    mockApiCall.mockResolvedValueOnce({
      qrCode: 'data:image/png;base64,abc',
      secret: 'SECRET',
    })

    render(<TwoFactorSettings />)

    await waitFor(() => {
      expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enable 2FA'))

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancel'))

    await waitFor(() => {
      expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
    })
  })

  it('handles disable flow', async () => {
    mockApiCall.mockResolvedValueOnce({ isEnabled: true })

    const onStatusChange = vi.fn()
    render(<TwoFactorSettings onStatusChange={onStatusChange} />)

    await waitFor(() => {
      expect(screen.getByText('Disable 2FA')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Disable 2FA'))

    // Should show disable confirmation
    await waitFor(() => {
      expect(screen.getByText(/Enter your current 2FA code/)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '654321' } })

    // Mock the disable call
    mockApiCall.mockResolvedValueOnce({})
    fireEvent.click(screen.getByText('Disable 2FA'))

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(false)
    })
  })

  it('uses custom texts', async () => {
    mockApiCall.mockResolvedValueOnce({ isEnabled: false })

    render(
      <TwoFactorSettings
        texts={{
          enableButton: 'Activer 2FA',
          enableDescription: 'Protegez votre compte',
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Activer 2FA')).toBeInTheDocument()
      expect(screen.getByText('Protegez votre compte')).toBeInTheDocument()
    })
  })
})
