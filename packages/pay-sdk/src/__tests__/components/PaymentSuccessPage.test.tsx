/**
 * PaymentSuccessPage — fallbackHref prop regression test.
 * Verifies the error-state "Go Back" button routes to `fallbackHref`
 * (fix for hardcoded `router.push('/')` causing non-localized 404).
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from './component-mocks.js'

const pushMock = vi.fn()

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  // No session_id → component renders error state, which is what we want.
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

const { PaymentSuccessPage } = await import('../../components/PaymentSuccessPage.js')

describe('PaymentSuccessPage — fallbackHref', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('defaults fallbackHref to "/" when not provided (error state)', () => {
    render(<PaymentSuccessPage errorButtonText="Go Back" />)

    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('uses custom fallbackHref when provided (error state)', () => {
    render(<PaymentSuccessPage fallbackHref="/en" errorButtonText="Go Back" />)

    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/en')
  })

  it('fallbackHref is independent of redirectTo', () => {
    render(
      <PaymentSuccessPage redirectTo="/en/dashboard" fallbackHref="/en" errorButtonText="Go Back" />
    )

    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/en')
    expect(pushMock).not.toHaveBeenCalledWith('/en/dashboard')
  })
})
