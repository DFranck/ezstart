/**
 * AuthCallbackPage — fallbackHref prop regression test.
 * Verifies the error-state "Go Back" button routes to `fallbackHref`
 * (fix for hardcoded `router.push('/')` causing non-localized 404).
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const pushMock = vi.fn()

// Mock useAuth — handleCallback is not exercised in the error branch (no code)
vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    handleCallback: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  // No code in URL → component renders error state immediately.
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/auth/callback',
}))

const { AuthCallbackPage } = await import('../../components/AuthCallbackPage.js')

describe('AuthCallbackPage — fallbackHref', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('defaults fallbackHref to "/" when not provided (error state)', () => {
    render(<AuthCallbackPage errorButtonText="Go Back" />)

    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('uses custom fallbackHref when provided (error state)', () => {
    render(<AuthCallbackPage fallbackHref="/en" errorButtonText="Go Back" />)

    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/en')
  })

  it('fallbackHref is independent of redirectTo', () => {
    render(
      <AuthCallbackPage redirectTo="/en/dashboard" fallbackHref="/en" errorButtonText="Go Back" />
    )

    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/en')
    expect(pushMock).not.toHaveBeenCalledWith('/en/dashboard')
  })
})
