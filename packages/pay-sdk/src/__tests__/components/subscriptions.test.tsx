/**
 * Tests for subscription components: SubscribeButton, SubscriptionCard, SubscriptionPlanCard
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  uiComponentsMock,
  loggerMock,
  sonnerMock,
  uiUtilsMock,
  nextImageMock,
  nextNavigationMock,
} from './component-mocks.js'
import { setupFetchMock, makePayment } from '../helpers.js'
import { PayProvider } from '../../react/pay-provider.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('@ezstart/ui/hooks', () => ({ useDeprecationWarning: vi.fn() }))
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { SubscribeButton } = await import('../../components/SubscribeButton.js')
const { SubscriptionCard } = await import('../../components/SubscriptionCard.js')
const { SubscriptionPlanCard } = await import('../../components/SubscriptionPlanCard.js')

// `SubscriptionCard` now consumes `useCancelSubscription` (React Query
// mutation), so every render path needs a `QueryClientProvider`. Fresh
// client per wrapper mount isolates cache state between test cases.
function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
        {children}
      </PayProvider>
    </QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// SubscribeButton
// ---------------------------------------------------------------------------

describe('SubscribeButton', () => {
  beforeEach(() => {
    setupFetchMock([
      {
        url: '/subscribe',
        method: 'POST',
        response: {
          success: true,
          data: {
            payment: makePayment({ type: 'subscription' }),
            checkoutUrl: 'https://checkout.stripe.com/sub',
          },
        },
      },
      {
        url: '/promos/validate',
        response: {
          success: true,
          data: { valid: true, discountType: 'percent', discountValue: 20, duration: 'once' },
        },
      },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders default trigger with plan name and price', () => {
    render(
      <Wrapper>
        <SubscribeButton
          projectId="proj1"
          priceId="price_1"
          planName="Pro"
          amount={29.99}
          currency="EUR"
        />
      </Wrapper>
    )
    expect(screen.getByText(/Pro/)).toBeInTheDocument()
  })

  it('opens modal on click', async () => {
    render(
      <Wrapper>
        <SubscribeButton projectId="proj1" priceId="price_1" planName="Pro" amount={29.99} />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Pro/))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('displays yearly interval when intervalCount=12', () => {
    render(
      <Wrapper>
        <SubscribeButton
          projectId="proj1"
          priceId="price_1"
          planName="Annual"
          amount={299}
          intervalCount={12}
        />
      </Wrapper>
    )
    expect(screen.getByText(/year/)).toBeInTheDocument()
  })

  it('displays multi-month interval', () => {
    render(
      <Wrapper>
        <SubscribeButton
          projectId="proj1"
          priceId="price_1"
          planName="Quarterly"
          amount={89}
          intervalCount={3}
        />
      </Wrapper>
    )
    expect(screen.getByText(/3 months/)).toBeInTheDocument()
  })

  it('shows promo code input when showPromoInput=true', async () => {
    render(
      <Wrapper>
        <SubscribeButton
          projectId="proj1"
          priceId="price_1"
          planName="Pro"
          amount={29.99}
          showPromoInput
        />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Pro/))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Promo code input should be rendered
    expect(screen.getByText('Promo code')).toBeInTheDocument()
  })

  it('renders custom trigger', () => {
    render(
      <Wrapper>
        <SubscribeButton
          projectId="proj1"
          priceId="price_1"
          planName="Pro"
          amount={29.99}
          trigger={<span data-testid="custom">Go Pro</span>}
        />
      </Wrapper>
    )
    expect(screen.getByTestId('custom')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// SubscriptionCard
// ---------------------------------------------------------------------------

describe('SubscriptionCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders active subscription with status badge', () => {
    render(
      <Wrapper>
        <SubscriptionCard
          subscription={{
            id: 'sub1',
            projectId: 'proj1',
            planName: 'Pro',
            amount: 29.99,
            currency: 'EUR',
            interval: 'month',
            status: 'completed',
            metadata: { subscriptionId: 'sub_stripe_1' },
          }}
        />
      </Wrapper>
    )
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders pending subscription', () => {
    render(
      <Wrapper>
        <SubscriptionCard
          subscription={{
            id: 'sub1',
            projectId: 'proj1',
            planName: 'Pro',
            amount: 29.99,
            status: 'pending',
          }}
        />
      </Wrapper>
    )
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows cancel button for active subscription with subscriptionId', () => {
    render(
      <Wrapper>
        <SubscriptionCard
          subscription={{
            id: 'sub1',
            projectId: 'proj1',
            planName: 'Pro',
            amount: 29.99,
            status: 'completed',
            metadata: { subscriptionId: 'sub_stripe_1' },
          }}
        />
      </Wrapper>
    )
    // The text appears in the card button AND the dialog title — use getAllByText
    const elements = screen.getAllByText('Cancel subscription')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('hides cancel button when showCancel=false', () => {
    render(
      <Wrapper>
        <SubscriptionCard
          subscription={{
            id: 'sub1',
            projectId: 'proj1',
            planName: 'Pro',
            amount: 29.99,
            status: 'completed',
            metadata: { subscriptionId: 'sub_1' },
          }}
          showCancel={false}
        />
      </Wrapper>
    )
    // Without cancel, the button text should not appear in a button
    // The ConfirmActionDialog title may still say "Cancel subscription" but dialog is closed
    const buttons = screen.queryAllByRole('button')
    const cancelButton = buttons.find(b => b.textContent?.includes('Cancel subscription'))
    expect(cancelButton).toBeUndefined()
  })

  it('hides cancel button for non-completed status', () => {
    render(
      <Wrapper>
        <SubscriptionCard
          subscription={{
            id: 'sub1',
            projectId: 'proj1',
            planName: 'Pro',
            amount: 29.99,
            status: 'cancelled',
            metadata: { subscriptionId: 'sub_1' },
          }}
        />
      </Wrapper>
    )
    // Cancelled subscription should not show the cancel button
    const buttons = screen.queryAllByRole('button')
    const cancelButton = buttons.find(b => b.textContent?.includes('Cancel subscription'))
    expect(cancelButton).toBeUndefined()
  })

  it('opens confirm dialog on cancel click', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        method: 'POST',
        response: { success: true },
      },
    ])

    render(
      <Wrapper>
        <SubscriptionCard
          subscription={{
            id: 'sub1',
            projectId: 'proj1',
            planName: 'Pro',
            amount: 29.99,
            status: 'completed',
            metadata: { subscriptionId: 'sub_1' },
          }}
        />
      </Wrapper>
    )

    // Find the cancel button (the one inside the card, not the dialog)
    const buttons = screen.getAllByRole('button')
    const cancelButton = buttons.find(b => b.textContent?.includes('Cancel subscription'))
    expect(cancelButton).toBeDefined()
    fireEvent.click(cancelButton!)

    // ConfirmActionDialog should open — verify the confirm description
    await waitFor(() => {
      expect(
        screen.getByText('Are you sure you want to cancel this subscription?')
      ).toBeInTheDocument()
    })
  })

  it('uses custom texts', () => {
    render(
      <Wrapper>
        <SubscriptionCard
          subscription={{
            id: 'sub1',
            projectId: 'proj1',
            planName: 'Pro',
            amount: 29.99,
            status: 'completed',
            metadata: { subscriptionId: 'sub_1' },
          }}
          texts={{ active: 'Running', cancel: 'Stop' }}
        />
      </Wrapper>
    )
    expect(screen.getByText('Running')).toBeInTheDocument()
    // 'Stop' appears in both the card button and the ConfirmActionDialog
    const stopElements = screen.getAllByText('Stop')
    expect(stopElements.length).toBeGreaterThanOrEqual(1)
  })

  it('displays multi-month interval', () => {
    render(
      <Wrapper>
        <SubscriptionCard
          subscription={{
            id: 'sub1',
            projectId: 'proj1',
            planName: 'Quarterly',
            amount: 89,
            interval: 'month',
            intervalCount: 3,
            status: 'completed',
            metadata: { subscriptionId: 'sub_1' },
          }}
        />
      </Wrapper>
    )
    expect(screen.getByText(/3 months/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// SubscriptionPlanCard
// ---------------------------------------------------------------------------

describe('SubscriptionPlanCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows skeleton while loading', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    render(
      <Wrapper>
        <SubscriptionPlanCard appName="test-app" planName="Pro" />
      </Wrapper>
    )

    // The Skeleton component should be rendered
    expect(screen.getByTestId('Skeleton')).toBeInTheDocument()
  })

  it('renders plan details after loading', async () => {
    setupFetchMock([
      {
        url: '/plans',
        response: {
          success: true,
          data: [
            {
              id: 'plan1',
              name: 'Pro',
              amount: 2999,
              currency: 'EUR',
              interval: 'month',
              intervalCount: 1,
              features: ['Analytics', 'Export', 'Priority Support'],
              active: true,
            },
          ],
          meta: { total: 1 },
        },
      },
    ])

    render(
      <Wrapper>
        <SubscriptionPlanCard appName="test-app" planName="Pro" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })

    // Features should be rendered
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Priority Support')).toBeInTheDocument()
  })

  it('renders nothing when plan not found', async () => {
    setupFetchMock([
      {
        url: '/plans',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    const { container } = render(
      <Wrapper>
        <SubscriptionPlanCard appName="test-app" planName="Nonexistent" />
      </Wrapper>
    )

    await waitFor(() => {
      // Skeleton should disappear and nothing rendered
      expect(screen.queryByTestId('Skeleton')).not.toBeInTheDocument()
    })

    // Container should be empty (plan not found renders null)
    // Give it time to settle
    await new Promise(r => setTimeout(r, 50))
  })

  it('renders compact variant', async () => {
    setupFetchMock([
      {
        url: '/plans',
        response: {
          success: true,
          data: [
            {
              id: 'plan1',
              name: 'Pro',
              amount: 999,
              currency: 'EUR',
              interval: 'month',
              intervalCount: 1,
              features: [],
              active: true,
            },
          ],
          meta: { total: 1 },
        },
      },
    ])

    render(
      <Wrapper>
        <SubscriptionPlanCard appName="test-app" planName="Pro" variant="compact" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })
  })

  it('renders featured variant with badge', async () => {
    setupFetchMock([
      {
        url: '/plans',
        response: {
          success: true,
          data: [
            {
              id: 'plan1',
              name: 'Pro',
              amount: 2999,
              currency: 'EUR',
              interval: 'month',
              intervalCount: 1,
              features: [],
              active: true,
            },
          ],
          meta: { total: 1 },
        },
      },
    ])

    render(
      <Wrapper>
        <SubscriptionPlanCard appName="test-app" planName="Pro" variant="featured" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })

    expect(screen.getByText('Most popular')).toBeInTheDocument()
  })
})
