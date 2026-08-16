import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import { VerifyEmailFlow } from '../../components/VerifyEmailFlow.js'

const mockApiCall = vi.mocked(apiCall)

describe('VerifyEmailFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows invalid state when no token', () => {
    render(<VerifyEmailFlow token={null} />)
    expect(screen.getByText('Invalid or expired link')).toBeInTheDocument()
    expect(screen.getByText('Request a new link')).toBeInTheDocument()
  })

  it('shows verifying spinner initially when token is present', () => {
    // API call will not resolve yet
    mockApiCall.mockReturnValue(new Promise(() => {}))
    render(<VerifyEmailFlow token="valid-token" />)
    expect(screen.getByText('Verifying your email...')).toBeInTheDocument()
  })

  it('shows success after successful verification', async () => {
    mockApiCall.mockResolvedValueOnce({ message: 'Email verified' })

    render(<VerifyEmailFlow token="valid-token" />)

    await waitFor(() => {
      expect(screen.getByText('Email verified successfully!')).toBeInTheDocument()
    })

    expect(screen.getByText('Back to login')).toBeInTheDocument()
  })

  it('shows already-verified state', async () => {
    mockApiCall.mockResolvedValueOnce({ message: 'Email already verified' })

    render(<VerifyEmailFlow token="valid-token" />)

    await waitFor(() => {
      expect(screen.getByText('Email already verified')).toBeInTheDocument()
    })
  })

  it('shows invalid state for ApiError with invalid message', async () => {
    const error = new (ApiError as unknown as new (msg: string, s: number) => Error)(
      'Token invalid',
      400
    )
    mockApiCall.mockRejectedValueOnce(error)

    render(<VerifyEmailFlow token="bad-token" />)

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired link')).toBeInTheDocument()
    })
  })

  it('shows error state for network errors', async () => {
    mockApiCall.mockRejectedValueOnce(new TypeError('Network error'))

    render(<VerifyEmailFlow token="valid-token" />)

    await waitFor(() => {
      expect(screen.getByText('Verification failed')).toBeInTheDocument()
    })
  })

  it('calls onSuccess after successful verification', async () => {
    const onSuccess = vi.fn()
    mockApiCall.mockResolvedValueOnce({ message: 'Email verified' })

    render(<VerifyEmailFlow token="valid-token" onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('supports custom texts', async () => {
    mockApiCall.mockResolvedValueOnce({ message: 'verified' })

    render(
      <VerifyEmailFlow
        token="valid-token"
        texts={{
          success: 'Votre email est verifie!',
          backToLogin: 'Retour',
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Votre email est verifie!')).toBeInTheDocument()
    })
    expect(screen.getByText('Retour')).toBeInTheDocument()
  })
})
