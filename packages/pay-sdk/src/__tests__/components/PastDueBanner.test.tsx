/**
 * Tests for PastDueBanner — surfaces a destructive Card when ANY of the
 * user's subscriptions is in `past_due` (Stripe terminology).
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  uiComponentsMock,
  loggerMock,
  sonnerMock,
  uiUtilsMock,
  nextImageMock,
  nextNavigationMock,
} from './component-mocks.js'
import { setupFetchMock } from '../helpers.js'
import { PayProvider } from '../../react/pay-provider.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { PastDueBanner } = await import('../../components/PastDueBanner.js')

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999/api' }}>
      {children}
    </PayProvider>
  )
}

describe('PastDueBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when the user has no subscriptions', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        method: 'GET',
        response: { success: true, payments: [], total: 0 },
      },
    ])

    const { container } = render(
      <Wrapper>
        <PastDueBanner userId="user_1" />
      </Wrapper>
    )

    // Wait for the async fetch to complete and isLoading to flip false.
    await waitFor(() => {
      // No banner rendered → container is empty (or contains null).
      expect(container.querySelector('[data-testid="Card"]')).toBeNull()
    })
  })

  it('renders nothing when the user has only active subscriptions', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        method: 'GET',
        response: {
          success: true,
          total: 1,
          payments: [
            {
              id: 'pay_active',
              projectId: 'ezbill',
              projectName: 'EZBill',
              type: 'subscription',
              amount: 19,
              currency: 'EUR',
              provider: 'stripe',
              paymentId: 'pi_1',
              status: 'completed',
              isAnonymous: false,
              liveMode: true,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
              metadata: { subscriptionStatus: 'active', planName: 'Pro' },
            },
          ],
        },
      },
    ])

    const { container } = render(
      <Wrapper>
        <PastDueBanner userId="user_1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(container.querySelector('[data-testid="Card"]')).toBeNull()
    })
  })

  it('renders the destructive banner when a subscription is past_due', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        method: 'GET',
        response: {
          success: true,
          total: 1,
          payments: [
            {
              id: 'pay_pd',
              projectId: 'ezbill',
              projectName: 'EZBill',
              type: 'subscription',
              amount: 49,
              currency: 'EUR',
              provider: 'stripe',
              paymentId: 'pi_pd',
              status: 'pending',
              isAnonymous: false,
              liveMode: true,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
              metadata: { subscriptionStatus: 'past_due', planName: 'Team' },
            },
          ],
        },
      },
    ])

    render(
      <Wrapper>
        <PastDueBanner userId="user_1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeInTheDocument()
    })
    expect(screen.getByText(/Team payment of/)).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('Update payment method')
  })

  it('treats `unpaid` subscriptionStatus as past_due (covers Stripe terminal dunning state)', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        method: 'GET',
        response: {
          success: true,
          total: 1,
          payments: [
            {
              id: 'pay_unpaid',
              projectId: 'ezbill',
              projectName: 'EZBill',
              type: 'subscription',
              amount: 19,
              currency: 'EUR',
              provider: 'stripe',
              paymentId: 'pi_unpaid',
              status: 'failed',
              isAnonymous: false,
              liveMode: true,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
              metadata: { subscriptionStatus: 'unpaid', planName: 'Pro' },
            },
          ],
        },
      },
    ])

    render(
      <Wrapper>
        <PastDueBanner userId="user_1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeInTheDocument()
    })
  })

  it('uses custom texts when provided', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        method: 'GET',
        response: {
          success: true,
          total: 1,
          payments: [
            {
              id: 'pay_pd',
              projectId: 'ezbill',
              projectName: 'EZBill',
              type: 'subscription',
              amount: 19,
              currency: 'EUR',
              provider: 'stripe',
              paymentId: 'pi_pd',
              status: 'pending',
              isAnonymous: false,
              liveMode: true,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
              metadata: { subscriptionStatus: 'past_due', planName: 'Pro' },
            },
          ],
        },
      },
    ])

    render(
      <Wrapper>
        <PastDueBanner
          userId="user_1"
          texts={{
            title: 'Paiement échoué',
            cta: 'Mettre à jour le paiement',
          }}
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Paiement échoué')).toBeInTheDocument()
    })
    expect(screen.getByRole('button')).toHaveTextContent('Mettre à jour le paiement')
  })

  it('invokes the onUpdatePayment handler when the CTA is clicked', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        method: 'GET',
        response: {
          success: true,
          total: 1,
          payments: [
            {
              id: 'pay_pd',
              projectId: 'ezbill',
              projectName: 'EZBill',
              type: 'subscription',
              amount: 19,
              currency: 'EUR',
              provider: 'stripe',
              paymentId: 'pi_pd',
              status: 'pending',
              isAnonymous: false,
              liveMode: true,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
              metadata: { subscriptionStatus: 'past_due', planName: 'Pro' },
            },
          ],
        },
      },
    ])

    const onUpdatePayment = vi.fn()
    render(
      <Wrapper>
        <PastDueBanner userId="user_1" onUpdatePayment={onUpdatePayment} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button'))
    expect(onUpdatePayment).toHaveBeenCalledTimes(1)
  })
})
