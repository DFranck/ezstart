/**
 * PaymentSuccessTemplate — public surface tests.
 *
 * Pin the contract for the Stripe-checkout success landing template exposed
 * by `@ezstart/ui/components/checkout-templates`. Originally extracted from
 * `@ezstart/pay-sdk` (`PaymentSuccessPage`) — now generic and reusable.
 *
 * Verifies:
 *   - Renders error state when no `session_id` is present
 *   - "Go Back" button uses `fallbackHref`
 *   - `fallbackHref` is independent of `redirectTo`
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

const { PaymentSuccessTemplate } =
  await import('../../../components/checkout-templates/payment-success')

describe('PaymentSuccessTemplate', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('defaults fallbackHref to "/" when not provided (error state)', () => {
    render(<PaymentSuccessTemplate errorButtonText="Go Back" />)
    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('uses custom fallbackHref when provided (error state)', () => {
    render(<PaymentSuccessTemplate fallbackHref="/en" errorButtonText="Go Back" />)
    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/en')
  })

  it('fallbackHref is independent of redirectTo', () => {
    render(
      <PaymentSuccessTemplate
        redirectTo="/en/dashboard"
        fallbackHref="/en"
        errorButtonText="Go Back"
      />
    )
    const btn = screen.getByRole('button', { name: 'Go Back' })
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/en')
    expect(pushMock).not.toHaveBeenCalledWith('/en/dashboard')
  })
})
