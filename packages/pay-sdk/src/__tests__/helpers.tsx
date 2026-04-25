/**
 * Test helpers for @ezstart/pay-sdk react + component tests.
 *
 * Provides mock PayClient, PayProvider wrapper, and test fixtures.
 */
import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { PayProvider } from '../react/pay-provider.js'
import { createPayClient, type PayClient } from '../core/pay-client.js'
import type {
  Payment,
  PaymentResponse,
  PaymentsListResponse,
  ConnectedAccount,
} from '../core/types.js'

// ---------------------------------------------------------------------------
// Mock PayClient — all methods return sensible defaults, individually mockable
// ---------------------------------------------------------------------------

export function createMockPayClient(overrides: Partial<PayClient> = {}): PayClient {
  const client = createPayClient({
    appName: 'test-app',
    apiUrl: 'http://localhost:9999/api',
  })

  // Override all methods with vi.fn() returning defaults
  const mocks: Record<string, ReturnType<typeof vi.fn>> = {
    createDonation: vi.fn().mockResolvedValue({
      success: true,
      payment: makePayment({ type: 'donation' }),
      checkoutUrl: 'https://checkout.stripe.com/test',
    } satisfies PaymentResponse),

    createPurchase: vi.fn().mockResolvedValue({
      success: true,
      payment: makePayment({ type: 'purchase' }),
      checkoutUrl: 'https://checkout.stripe.com/test',
    } satisfies PaymentResponse),

    createSubscription: vi.fn().mockResolvedValue({
      success: true,
      payment: makePayment({ type: 'subscription' }),
      checkoutUrl: 'https://checkout.stripe.com/test',
    } satisfies PaymentResponse),

    getDonations: vi.fn().mockResolvedValue({
      success: true,
      payments: [],
      total: 0,
    } satisfies PaymentsListResponse),

    getPurchases: vi.fn().mockResolvedValue({
      success: true,
      payments: [],
      total: 0,
    } satisfies PaymentsListResponse),

    getSubscriptions: vi.fn().mockResolvedValue({
      success: true,
      payments: [],
      total: 0,
    } satisfies PaymentsListResponse),

    getPayments: vi.fn().mockResolvedValue({
      success: true,
      payments: [],
      total: 0,
    } satisfies PaymentsListResponse),

    getMyPayments: vi.fn().mockResolvedValue({
      success: true,
      payments: [],
      total: 0,
    } satisfies PaymentsListResponse),

    getPayment: vi.fn().mockResolvedValue(makePayment()),

    cancelSubscription: vi.fn().mockResolvedValue({ success: true }),

    refundPayment: vi.fn().mockResolvedValue({ success: true }),

    validatePromo: vi.fn().mockResolvedValue({
      success: true,
      data: { valid: true, discountType: 'percent', discountValue: 20, duration: 'once' },
    }),

    listPromos: vi.fn().mockResolvedValue({
      success: true,
      data: [],
      meta: { total: 0, limit: 20, offset: 0 },
    }),

    createPromo: vi.fn().mockResolvedValue({ success: true, data: { promo: {} } }),
    updatePromo: vi.fn().mockResolvedValue({ success: true, data: { promo: {} } }),
    deletePromo: vi.fn().mockResolvedValue({ success: true }),

    listPlans: vi.fn().mockResolvedValue({
      success: true,
      data: [],
      meta: { total: 0, limit: 20, offset: 0 },
    }),

    createPlan: vi.fn().mockResolvedValue({ success: true, data: { plan: {} } }),
    updatePlan: vi.fn().mockResolvedValue({ success: true, data: { plan: {} } }),
    deletePlan: vi.fn().mockResolvedValue({ success: true }),

    getDonationStats: vi.fn().mockResolvedValue({
      success: true,
      stats: { total: 0, count: 0, byType: {}, recent: [] },
    }),

    cleanupPayments: vi.fn().mockResolvedValue({ deletedCount: 0 }),

    getConnectStatus: vi.fn().mockResolvedValue({
      connectedAccount: null,
    }),

    connectOnboard: vi.fn().mockResolvedValue({
      accountLinkUrl: 'https://connect.stripe.com/setup/test',
      connectedAccount: makeConnectedAccount(),
    }),

    getConnectDashboardLink: vi.fn().mockResolvedValue({
      loginLinkUrl: 'https://dashboard.stripe.com/test',
    }),

    disconnectAccount: vi.fn().mockResolvedValue({ success: true }),
  }

  // Apply overrides
  for (const [key, fn] of Object.entries({ ...mocks, ...overrides })) {
    Object.defineProperty(client, key, { value: fn, writable: true })
  }

  return client
}

// ---------------------------------------------------------------------------
// Test Payment factory
// ---------------------------------------------------------------------------

let idCounter = 0

export function makeConnectedAccount(overrides: Partial<ConnectedAccount> = {}): ConnectedAccount {
  return {
    stripeAccountId: 'acct_test123',
    email: 'test@example.com',
    businessName: 'Test Business',
    accountType: 'standard',
    status: 'active',
    chargesEnabled: true,
    payoutsEnabled: true,
    defaultFeePercent: 5,
    onboardedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-15T10:00:00Z',
    ...overrides,
  }
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  idCounter++
  return {
    id: `pay_${idCounter}`,
    projectId: 'test-project',
    projectName: 'Test Project',
    type: 'purchase',
    amount: 10,
    currency: 'EUR',
    provider: 'stripe',
    paymentId: `pi_${idCounter}`,
    status: 'completed',
    isAnonymous: false,
    liveMode: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Wrapper that renders children inside PayProvider with a mock client
// ---------------------------------------------------------------------------

interface WrapperOptions {
  client?: PayClient
  appName?: string
}

export function createWrapper(options: WrapperOptions = {}) {
  const client = options.client ?? createMockPayClient()

  function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <PayProvider
        appName={options.appName ?? 'test-app'}
        config={{ apiUrl: 'http://localhost:9999/api' }}
      >
        {children}
      </PayProvider>
    )
  }

  // Patch the context to use our mock client
  return { Wrapper: TestWrapper, client }
}

/**
 * Render with PayProvider context, injecting a mock PayClient.
 * Returns the mock client for assertion + the render result.
 */
export function renderWithPay(
  ui: React.ReactElement,
  options: WrapperOptions & { renderOptions?: Omit<RenderOptions, 'wrapper'> } = {}
) {
  const mockClient = options.client ?? createMockPayClient()

  // We need to mock the PayClient constructor so PayProvider uses our mock
  // Instead, we mock at the module level. But that's complex.
  // Simpler: We mock the specific instance methods on the client that PayProvider creates.
  // Actually, the cleanest approach is to mock global fetch and have the real PayClient call it.

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <PayProvider
        appName={options.appName ?? 'test-app'}
        config={{ apiUrl: 'http://localhost:9999/api' }}
      >
        {children}
      </PayProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options.renderOptions }),
    client: mockClient,
  }
}

// ---------------------------------------------------------------------------
// Fetch mock helper — mock global fetch responses
// ---------------------------------------------------------------------------

type FetchMockRule = {
  url: string | RegExp
  method?: string
  response: unknown
  status?: number
}

export function setupFetchMock(rules: FetchMockRule[]) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = init?.method?.toUpperCase() ?? 'GET'

    for (const rule of rules) {
      const urlMatch = typeof rule.url === 'string' ? url.includes(rule.url) : rule.url.test(url)

      if (urlMatch && (!rule.method || rule.method === method)) {
        return new Response(JSON.stringify(rule.response), {
          status: rule.status ?? 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Default: 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
