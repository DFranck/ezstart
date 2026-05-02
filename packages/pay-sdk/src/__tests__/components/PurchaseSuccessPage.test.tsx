/**
 * PurchaseSuccessPage — deprecated re-export contract test.
 *
 * The component was moved to `@ezstart/ui` as `PurchaseSuccessTemplate`
 * (2026-05-01). Pay-sdk surface preserved for 90 days. Removal 2026-08-01.
 *
 * Full behaviour suite:
 *   `@ezstart/ui/__tests__/components/checkout-templates/purchase-success.test.tsx`
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

const { PurchaseSuccessPage } = await import('../../components/PurchaseSuccessPage.js')

describe('PurchaseSuccessPage (deprecated re-export)', () => {
  it('renders the underlying PurchaseSuccessTemplate with English defaults', () => {
    render(<PurchaseSuccessPage />)
    expect(screen.getByText('Purchase Complete!')).toBeInTheDocument()
    expect(screen.getByText('Back to home')).toBeInTheDocument()
  })

  it('forwards texts overrides to the underlying template', () => {
    render(
      <PurchaseSuccessPage texts={{ title: 'Order OK', description: 'Done', ctaLabel: 'Home' }} />
    )
    expect(screen.getByText('Order OK')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
