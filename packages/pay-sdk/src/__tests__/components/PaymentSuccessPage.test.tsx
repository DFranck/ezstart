/**
 * PaymentSuccessPage — deprecated re-export contract test.
 *
 * The component was moved to `@ezstart/ui` as `PaymentSuccessTemplate`
 * (2026-05-01). The pay-sdk surface is preserved for 90 days as a deprecated
 * re-export (planned removal 2026-08-01). This test pins the contract that
 * the re-export forwards every prop to the underlying template and renders
 * its expected error markup when no `?session_id` is present.
 *
 * Full router/navigation behaviour suite (auto-redirect, fallbackHref →
 * router.push wiring) lives in
 * `@ezstart/ui/__tests__/components/checkout-templates/payment-success.test.tsx`
 * where the real Next.js navigation mock environment is set up.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from './component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('@ezstart/ui/hooks', () => ({ useDeprecationWarning: vi.fn() }))

// Empty searchParams → template renders the error state (no session_id).
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

const { PaymentSuccessPage } = await import('../../components/PaymentSuccessPage.js')

describe('PaymentSuccessPage (deprecated re-export)', () => {
  it('renders the underlying PaymentSuccessTemplate error state when no session_id', () => {
    render(
      <PaymentSuccessPage errorButtonText="Go Back" errorMessage="Payment verification failed" />
    )
    expect(screen.getByText('Payment verification failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()
  })

  it('forwards the errorMessage prop to the template', () => {
    render(<PaymentSuccessPage errorMessage="Custom error" />)
    expect(screen.getByText('Custom error')).toBeInTheDocument()
  })

  it('forwards the errorButtonText prop to the template', () => {
    render(<PaymentSuccessPage errorButtonText="Custom Back" />)
    expect(screen.getByRole('button', { name: 'Custom Back' })).toBeInTheDocument()
  })
})
