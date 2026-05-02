/**
 * SubscribeSuccessPage — deprecated re-export contract test.
 *
 * The component was moved to `@ezstart/ui` as `SubscribeSuccessTemplate`
 * (2026-05-01). Pay-sdk surface preserved for 90 days. Removal 2026-08-01.
 *
 * Full behaviour suite:
 *   `@ezstart/ui/__tests__/components/checkout-templates/subscribe-success.test.tsx`
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

const { SubscribeSuccessPage } = await import('../../components/SubscribeSuccessPage.js')

describe('SubscribeSuccessPage (deprecated re-export)', () => {
  it('renders the underlying SubscribeSuccessTemplate with English defaults', () => {
    render(<SubscribeSuccessPage redirectTo="/dashboard" redirectDelayMs={0} />)
    expect(screen.getByText('Subscription Successful!')).toBeInTheDocument()
    expect(screen.getByText('Go to dashboard')).toBeInTheDocument()
  })

  it('forwards texts overrides to the underlying template', () => {
    render(
      <SubscribeSuccessPage
        redirectTo="/x"
        redirectDelayMs={0}
        texts={{ title: 'Custom', description: 'Custom desc', ctaLabel: 'Custom CTA' }}
      />
    )
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Custom desc')).toBeInTheDocument()
    expect(screen.getByText('Custom CTA')).toBeInTheDocument()
  })
})
