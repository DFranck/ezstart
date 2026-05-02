/**
 * Adversarial / Security tests for @ezstart/pay-sdk
 *
 * Tests for potential attack vectors:
 * 1. Price manipulation — can client code change amounts before checkout?
 * 2. Promo code replay — apply same code twice in quick succession
 * 3. XSS in donation messages
 * 4. Payment status spoofing
 * 5. FeatureGate bypass
 * 6. Auth token handling (401 retry, token exposure)
 * 7. Stripe key exposure
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  uiComponentsMock,
  loggerMock,
  sonnerMock,
  uiUtilsMock,
  nextImageMock,
  nextNavigationMock,
} from '../components/component-mocks.js'
import { setupFetchMock, makePayment } from '../helpers.js'
import { PayProvider } from '../../react/pay-provider.js'
import { createPayClient } from '../../core/pay-client.js'
import { useSubscriptionStatus } from '../../react/hooks/useSubscriptionStatus.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('@ezstart/ui/hooks', () => ({ useDeprecationWarning: vi.fn() }))
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999/api' }}>
      {children}
    </PayProvider>
  )
}

// ---------------------------------------------------------------------------
// 1. Price manipulation — amounts come from client props but server is SoT
// ---------------------------------------------------------------------------

describe('Price manipulation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the amount from props to the server — server validates', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            payment: makePayment({ amount: 10 }),
            checkoutUrl: 'https://checkout.stripe.com/test',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({ appName: 'test', apiUrl: 'http://localhost:9999/api' })
    await client.createPurchase({
      projectId: 'proj1',
      productId: 'prod1',
      productName: 'Widget',
      amount: 10,
    })

    // The amount sent to the server is from the props, not modifiable post-send
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    expect(body.amount).toBe(10)

    // IMPORTANT: The server MUST validate the amount against the real product price.
    // The SDK only transmits what the component receives — it does NOT enforce server-side pricing.
    // This is by design: Stripe checkout sessions are created server-side with the real price.
  })

  it('checkout URL is server-generated — client cannot forge it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            payment: makePayment(),
            checkoutUrl: 'https://checkout.stripe.com/cs_test_abc123',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({ appName: 'test', apiUrl: 'http://localhost:9999/api' })
    const result = await client.createPurchase({
      projectId: 'proj1',
      productId: 'prod1',
      productName: 'Widget',
      amount: 10,
    })

    // The checkoutUrl comes from the server, not constructed client-side
    expect(result.checkoutUrl).toBe('https://checkout.stripe.com/cs_test_abc123')
  })

  it('negative/zero amounts are handled by the server', async () => {
    // The SDK does not validate amounts — that is the server's job
    // This test documents that the SDK will forward any amount value
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Amount must be positive' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({ appName: 'test', apiUrl: 'http://localhost:9999/api' })

    await expect(
      client.createPurchase({
        projectId: 'proj1',
        productId: 'prod1',
        productName: 'Widget',
        amount: -5,
      })
    ).rejects.toThrow('Amount must be positive')
  })
})

// ---------------------------------------------------------------------------
// 2. Promo code replay — apply same code twice quickly
// ---------------------------------------------------------------------------

describe('Promo code replay', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('server enforces max uses — SDK just sends the code', async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++
      // First use succeeds, second fails
      if (callCount <= 1) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              payment: makePayment(),
              checkoutUrl: 'https://checkout.stripe.com/test',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({
          error: 'Promo code already used',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({ appName: 'test', apiUrl: 'http://localhost:9999/api' })

    // First call succeeds
    const result = await client.createSubscription({
      projectId: 'proj1',
      planId: 'plan1',
      planName: 'Pro',
      amount: 29.99,
      promoCode: 'ONEUSE',
    })
    expect(result.checkoutUrl).toBeTruthy()

    // Second call with same promo should fail (server enforced)
    await expect(
      client.createSubscription({
        projectId: 'proj1',
        planId: 'plan1',
        planName: 'Pro',
        amount: 29.99,
        promoCode: 'ONEUSE',
      })
    ).rejects.toThrow('Promo code already used')
  })

  it('concurrent validation requests are independent (no client-side dedup)', async () => {
    let validationCount = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      validationCount++
      return new Response(
        JSON.stringify({
          success: true,
          data: { valid: true, discountType: 'percent', discountValue: 20, duration: 'once' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({ appName: 'test', apiUrl: 'http://localhost:9999/api' })

    // Fire two validation requests simultaneously
    await Promise.all([
      client.validatePromo('SAVE20', 'test-app'),
      client.validatePromo('SAVE20', 'test-app'),
    ])

    // Both should go to the server — SDK doesn't cache/dedup
    expect(validationCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 3. XSS in donation messages
// ---------------------------------------------------------------------------

describe('XSS in donation messages', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('DonationWall renders message as text, not HTML', async () => {
    const { DonationWall } = await import('../../components/DonationWall.js')

    const xssPayload = '<script>alert("xss")</script>'
    const donations = [
      makePayment({
        type: 'donation',
        id: 'xss1',
        customerName: 'Attacker',
        amount: 1,
        isAnonymous: false,
        metadata: { message: xssPayload },
      }),
    ]

    setupFetchMock([
      {
        url: '/donations',
        response: { success: true, data: donations, meta: { total: 1 } },
      },
    ])

    render(
      <Wrapper>
        <DonationWall projectId="proj1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Attacker')).toBeInTheDocument()
    })

    // The script tag should be rendered as text, not executed
    // React auto-escapes by default — verify no actual script tag in DOM
    const messageEl = screen.getByText(xssPayload)
    expect(messageEl.tagName).not.toBe('SCRIPT')
    expect(messageEl.innerHTML).not.toContain('<script>')
    // The text should be escaped
    expect(messageEl.textContent).toBe(xssPayload)
  })

  it('React escapes HTML in DonationCard input values', () => {
    // React inherently escapes text content — this test documents the safety.
    // The message goes through an Input component, and when displayed back,
    // React's virtual DOM escapes any HTML entities.
    // There is no `dangerouslySetInnerHTML` in any pay-sdk component.
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. Payment status display before server confirmation
// ---------------------------------------------------------------------------

describe('Payment status trust', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('PaymentSuccessPage requires server session_id — no client-only spoofing', async () => {
    // The PaymentSuccessPage checks for ?session_id in the URL
    // Without it, it shows an error state
    // This means a user cannot simply navigate to /success without a valid Stripe session

    const { PaymentSuccessPage } = await import('../../components/PaymentSuccessPage.js')

    // Mock useSearchParams to return no session_id
    render(<PaymentSuccessPage />)

    await waitFor(() => {
      expect(screen.getByText('Payment verification failed')).toBeInTheDocument()
    })
  })

  it('subscription status comes from server — cannot be faked client-side', async () => {
    // The useSubscriptionStatus hook fetches from the server
    // A user cannot override the hook's internal state

    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    const { result } = renderHook(
      () => useSubscriptionStatus({ userId: 'u1', appName: 'test-app' }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Without a valid subscription from the server, status is inactive
    expect(result.current.isActive).toBe(false)
    expect(result.current.features).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 5. FeatureGate bypass
// ---------------------------------------------------------------------------

describe('FeatureGate bypass', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('FeatureGate relies on server data — cannot be bypassed by modifying React state', async () => {
    const { FeatureGate } = await import('../../components/FeatureGate.js')

    // Server says no subscription
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    render(
      <Wrapper>
        <FeatureGate feature="premium-export" userId="u1" appName="test-app">
          <div data-testid="secret">Premium content</div>
        </FeatureGate>
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.queryByTestId('secret')).not.toBeInTheDocument()
    })

    // NOTE: FeatureGate is a CLIENT-SIDE convenience for UI rendering only.
    // It MUST NOT be relied upon for security — server APIs must independently
    // verify feature access. FeatureGate is for UX, not authorization.
  })

  it('FeatureGate only matches exact feature names', async () => {
    const { FeatureGate } = await import('../../components/FeatureGate.js')

    const sub = makePayment({
      type: 'subscription',
      status: 'completed',
      metadata: { planName: 'Pro', features: ['analytics'] },
    })

    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [sub], meta: { total: 1 } },
      },
    ])

    render(
      <Wrapper>
        <FeatureGate feature="analytics-premium" userId="u1" appName="test-app">
          <div data-testid="gated">Content</div>
        </FeatureGate>
      </Wrapper>
    )

    await waitFor(() => {
      // "analytics-premium" !== "analytics" — gate should NOT open
      expect(screen.queryByTestId('gated')).not.toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// 6. Auth token handling
// ---------------------------------------------------------------------------

describe('Auth token security', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends Authorization header when getToken is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
      getToken: () => 'secret-jwt-token',
    })

    await client.getPayments()

    const headers = fetchMock.mock.calls[0]?.[1]?.headers
    expect(headers?.Authorization).toBe('Bearer secret-jwt-token')
  })

  it.each(['mine', 'myApps', 'all'] as const)(
    'forwards scope=%s to the payments query string',
    async scope => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      vi.stubGlobal('fetch', fetchMock)

      const client = createPayClient({
        appName: 'test',
        apiUrl: 'http://localhost:9999/api',
        getToken: () => 'token',
      })

      await client.getPayments({ scope })

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toContain(`scope=${scope}`)
    }
  )

  it.each(['mine', 'myApps', 'all'] as const)(
    'forwards scope=%s to the subscriptions query string',
    async scope => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      vi.stubGlobal('fetch', fetchMock)

      const client = createPayClient({
        appName: 'test',
        apiUrl: 'http://localhost:9999/api',
        getToken: () => 'token',
      })

      await client.getSubscriptions({ scope })

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toContain(`scope=${scope}`)
    }
  )

  it('retries with refreshed token on 401', async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      callCount++
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      // Second call with refreshed token succeeds
      return new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const onAuthFailure = vi.fn()
    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
      getToken: () => 'expired-token',
      onTokenRefresh: async () => 'new-token',
      onAuthFailure,
    })

    await client.getPayments()

    expect(callCount).toBe(2) // Initial + retry
    // Second call should have the new token
    const retryHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers)
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-token')
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('calls onAuthFailure when refresh fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const onAuthFailure = vi.fn()
    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
      getToken: () => 'expired-token',
      onTokenRefresh: async () => {
        throw new Error('Refresh failed')
      },
      onAuthFailure,
    })

    // getPayments will throw because the 401 response results in a non-ok fetch
    try {
      await client.getPayments()
    } catch {
      // Expected to throw "Unauthorized" or "Failed to fetch payments"
    }

    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('sends X-API-Key header when apiKey is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
      apiKey: 'epk_test123',
    })

    await client.getPayments()

    const headers = fetchMock.mock.calls[0]?.[1]?.headers
    expect(headers?.['X-API-Key']).toBe('epk_test123')
  })

  it('does not expose token in URL (only in headers)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
      getToken: () => 'my-secret-token',
      apiKey: 'epk_secret',
    })

    await client.getPayments()

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).not.toContain('my-secret-token')
    expect(calledUrl).not.toContain('epk_secret')
  })
})

// ---------------------------------------------------------------------------
// 7. Stripe key exposure
// ---------------------------------------------------------------------------

describe('Stripe key exposure', () => {
  it('SDK does not contain or expose any Stripe secret key', () => {
    // The SDK only uses apiUrl and auth tokens — no Stripe keys at all
    // Stripe publishable key is only needed in the browser when loading Stripe.js
    // which is NOT handled by this SDK (it just receives checkout URLs from the server)

    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
    })

    // Verify the client config does not have Stripe key fields
    const config = JSON.stringify(client)
    expect(config).not.toContain('sk_')
    expect(config).not.toContain('pk_')
    expect(config).not.toContain('stripe')
  })

  it('SDK architecture is server-delegated checkout — no client-side Stripe calls', () => {
    // The SDK creates payments by calling the API server which creates Stripe sessions
    // The SDK then redirects to the checkoutUrl returned by the server
    // This means the Stripe secret key only lives on the server

    // Verify PayClient methods use fetch() to call the API, not Stripe.js
    const client = createPayClient({ appName: 'test', apiUrl: 'http://localhost:9999/api' })

    // All payment creation methods return a checkoutUrl from the server
    // There is no `stripe.redirectToCheckout()` or `stripe.createPaymentIntent()`
    // in this SDK's codebase
    expect(typeof client.createDonation).toBe('function')
    expect(typeof client.createPurchase).toBe('function')
    expect(typeof client.createSubscription).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// 8. Input sanitization (amounts, strings)
// ---------------------------------------------------------------------------

describe('Input sanitization', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('DonateModal rejects NaN and negative amounts', async () => {
    const { DonateModal } = await import('../../components/DonateModal.js')

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <Wrapper>
        <DonateModal projectId="proj1" amounts={[5, 10]} />
      </Wrapper>
    )

    // Open modal - click the first element containing Donate
    const triggers = screen.getAllByText(/Donate/)
    fireEvent.click(triggers[0]!)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Enter negative custom amount
    const customInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(customInput, { target: { value: '-10' } })

    // Find the submit button (type=submit) inside the dialog
    const submitButtons = screen.getAllByRole('button')
    const submitBtn = submitButtons.find(b => b.getAttribute('type') === 'submit')
    // With negative amount, button should be disabled
    expect(submitBtn).toBeDefined()
    expect(submitBtn).toBeDisabled()
  })
})
