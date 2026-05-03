/**
 * Tests for ManageSubscriptionButton — opens the Stripe Customer Portal.
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

const { ManageSubscriptionButton } = await import('../../components/ManageSubscriptionButton.js')

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
      {children}
    </PayProvider>
  )
}

describe('ManageSubscriptionButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: 'https://app.example.com/billing' },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the default English label', () => {
    setupFetchMock([])
    render(
      <Wrapper>
        <ManageSubscriptionButton />
      </Wrapper>
    )

    expect(screen.getByRole('button')).toHaveTextContent('Manage subscription')
  })

  it('renders a custom label from the texts prop', () => {
    setupFetchMock([])
    render(
      <Wrapper>
        <ManageSubscriptionButton texts={{ label: 'Gérer mon abonnement' }} />
      </Wrapper>
    )

    expect(screen.getByRole('button')).toHaveTextContent('Gérer mon abonnement')
  })

  it('uses the children override in place of the default label', () => {
    setupFetchMock([])
    render(
      <Wrapper>
        <ManageSubscriptionButton>Update billing</ManageSubscriptionButton>
      </Wrapper>
    )

    expect(screen.getByRole('button')).toHaveTextContent('Update billing')
  })

  it('calls the billing portal endpoint on click and redirects', async () => {
    setupFetchMock([
      {
        url: '/billing/portal',
        method: 'POST',
        response: {
          success: true,
          data: { url: 'https://billing.stripe.com/session/click' },
        },
      },
    ])

    render(
      <Wrapper>
        <ManageSubscriptionButton returnUrl="https://app.example.com/account" />
      </Wrapper>
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect((window.location as Location).href).toBe('https://billing.stripe.com/session/click')
    })
  })

  it('disables the button and shows the loading label while fetching', async () => {
    let resolveFetch: (() => void) | null = null
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>(resolve => {
            resolveFetch = () =>
              resolve(
                new Response(
                  JSON.stringify({
                    success: true,
                    data: { url: 'https://billing.stripe.com/session/slow' },
                  }),
                  { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
              )
          })
      )
    )

    render(
      <Wrapper>
        <ManageSubscriptionButton texts={{ loading: 'Opening...' }} />
      </Wrapper>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toHaveTextContent('Opening...')
    })
    expect(button).toBeDisabled()

    resolveFetch?.()
  })

  it('displays the error message when the portal call fails', async () => {
    setupFetchMock([
      {
        url: '/billing/portal',
        method: 'POST',
        response: { error: 'No subscription found for this user' },
        status: 404,
      },
    ])

    render(
      <Wrapper>
        <ManageSubscriptionButton texts={{ error: 'Custom error message' }} />
      </Wrapper>
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })
  })
})
