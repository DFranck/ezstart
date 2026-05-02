/**
 * PurchaseCancelPage — deprecated re-export contract test.
 *
 * The component was moved to `@ezstart/ui` as `PurchaseCancelTemplate`
 * (2026-05-01). Pay-sdk surface preserved for 90 days. Removal 2026-08-01.
 *
 * Full behaviour suite:
 *   `@ezstart/ui/__tests__/components/checkout-templates/purchase-cancel.test.tsx`
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

const { PurchaseCancelPage } = await import('../../components/PurchaseCancelPage.js')

describe('PurchaseCancelPage (deprecated re-export)', () => {
  it('renders the underlying PurchaseCancelTemplate with English defaults', () => {
    render(<PurchaseCancelPage />)
    expect(screen.getByText('Payment Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
  })

  it('forwards custom hrefs to the underlying template', () => {
    const { container } = render(
      <PurchaseCancelPage tryAgainHref="/en/purchase" backHomeHref="/en" />
    )
    const links = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(links).toContain('/en/purchase')
    expect(links).toContain('/en')
  })
})
