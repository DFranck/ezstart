/**
 * PurchaseCancelPage — drop-in purchase cancel landing.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from './component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

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

describe('PurchaseCancelPage', () => {
  it('renders English defaults', () => {
    render(<PurchaseCancelPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Payment Cancelled')
    expect(screen.getByText(/Your payment was cancelled/)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
  })

  it('uses custom hrefs', () => {
    const { container } = render(
      <PurchaseCancelPage tryAgainHref="/en/purchase" backHomeHref="/en" />
    )
    const links = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(links).toContain('/en/purchase')
    expect(links).toContain('/en')
  })

  it('overrides texts', () => {
    render(
      <PurchaseCancelPage texts={{ title: 'Cancelled order', primaryCtaLabel: 'Shop again' }} />
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cancelled order')
    expect(screen.getByText('Shop again')).toBeInTheDocument()
  })
})
