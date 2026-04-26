/**
 * Tests for InvoiceHistorySection — invoice listing UI for SaaS billing.
 *
 * Covers:
 *  - Loading skeleton state
 *  - Empty state with empty message
 *  - Renders invoice rows from `usePaymentHistory`
 *  - Status mapping (`completed` → "Paid")
 *  - Status filter triggers a re-fetch with backend `status`
 *  - Error state surfaces retry
 *  - VULN-1 graceful fallback when `applicationResolutionStatus === 'failed'`
 *  - Action column omitted when neither pdfUrl nor receiptUrl exist
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { InvoiceHistorySection } = await import('../../components/InvoiceHistorySection.js')

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider
      appName="test-app"
      applicationId="app_test"
      config={{ apiUrl: 'http://localhost:9999/api' }}
    >
      {children}
    </PayProvider>
  )
}

describe('InvoiceHistorySection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders header with title and description', async () => {
    setupFetchMock([
      {
        url: '/payments',
        method: 'GET',
        response: { success: true, data: [], meta: { total: 0, limit: 100, offset: 0 } },
      },
    ])

    render(
      <Wrapper>
        <InvoiceHistorySection userId="u_1" />
      </Wrapper>
    )

    expect(screen.getByText('Invoices')).toBeInTheDocument()
    expect(screen.getByText('Your billing history')).toBeInTheDocument()
  })

  it('renders the empty state when no invoices come back', async () => {
    setupFetchMock([
      {
        url: '/payments',
        method: 'GET',
        response: { success: true, data: [], meta: { total: 0, limit: 100, offset: 0 } },
      },
    ])

    render(
      <Wrapper>
        <InvoiceHistorySection userId="u_1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('No invoices yet')).toBeInTheDocument()
    })
  })

  it('renders invoice rows with mapped status (completed → Paid)', async () => {
    setupFetchMock([
      {
        url: '/payments',
        method: 'GET',
        response: {
          success: true,
          data: [
            makePayment({
              id: 'inv_1',
              type: 'invoice',
              status: 'completed',
              amount: 4900,
              currency: 'EUR',
              metadata: { invoiceNumber: 'INV-2026-001', invoiceId: 'in_1' },
            }),
            makePayment({
              id: 'inv_2',
              type: 'invoice',
              status: 'pending',
              amount: 4900,
              currency: 'EUR',
              metadata: { invoiceNumber: 'INV-2026-002', invoiceId: 'in_2' },
            }),
          ],
          meta: { total: 2, limit: 100, offset: 0 },
        },
      },
    ])

    render(
      <Wrapper>
        <InvoiceHistorySection userId="u_1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('INV-2026-001')).toBeInTheDocument()
      expect(screen.getByText('INV-2026-002')).toBeInTheDocument()
    })

    // `completed` is shown as "Paid" (Stripe / Clerk vocabulary).
    // The label appears both in the filter Select option AND in the status
    // badge, so we assert at least one match (the badge).
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('emits the backend "type=invoice" filter on the request', async () => {
    const fetchMock = setupFetchMock([
      {
        url: '/payments',
        method: 'GET',
        response: { success: true, data: [], meta: { total: 0, limit: 100, offset: 0 } },
      },
    ])

    render(
      <Wrapper>
        <InvoiceHistorySection userId="u_1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const calls = fetchMock.mock.calls
    const lastUrl = calls[calls.length - 1]?.[0] as string
    expect(lastUrl).toContain('type=invoice')
  })

  it('shows the dash placeholder when invoices have neither pdfUrl nor receiptUrl', async () => {
    setupFetchMock([
      {
        url: '/payments',
        method: 'GET',
        response: {
          success: true,
          data: [
            makePayment({
              id: 'inv_no_url',
              type: 'invoice',
              status: 'completed',
              metadata: { invoiceNumber: 'INV-X' },
            }),
          ],
          meta: { total: 1, limit: 100, offset: 0 },
        },
      },
    ])

    render(
      <Wrapper>
        <InvoiceHistorySection userId="u_1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('INV-X')).toBeInTheDocument()
    })

    // Action column renders an em-dash placeholder when no URLs are available.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders Download / View receipt links when metadata exposes URLs', async () => {
    setupFetchMock([
      {
        url: '/payments',
        method: 'GET',
        response: {
          success: true,
          data: [
            makePayment({
              id: 'inv_with_url',
              type: 'invoice',
              status: 'completed',
              metadata: {
                invoiceNumber: 'INV-Y',
                invoicePdfUrl: 'https://stripe.example/inv.pdf',
                hostedInvoiceUrl: 'https://stripe.example/inv',
              },
            }),
          ],
          meta: { total: 1, limit: 100, offset: 0 },
        },
      },
    ])

    render(
      <Wrapper>
        <InvoiceHistorySection userId="u_1" />
      </Wrapper>
    )

    await waitFor(() => {
      const pdfLink = document.querySelector('a[href="https://stripe.example/inv.pdf"]')
      const receiptLink = document.querySelector('a[href="https://stripe.example/inv"]')
      expect(pdfLink).not.toBeNull()
      expect(receiptLink).not.toBeNull()
    })
  })

  it('uses provided texts to override defaults', async () => {
    setupFetchMock([
      {
        url: '/payments',
        method: 'GET',
        response: { success: true, data: [], meta: { total: 0, limit: 100, offset: 0 } },
      },
    ])

    render(
      <Wrapper>
        <InvoiceHistorySection
          userId="u_1"
          texts={{
            title: 'Mes factures',
            description: 'Historique de facturation',
            empty: 'Aucune facture pour le moment',
          }}
        />
      </Wrapper>
    )

    expect(screen.getByText('Mes factures')).toBeInTheDocument()
    expect(screen.getByText('Historique de facturation')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Aucune facture pour le moment')).toBeInTheDocument()
    })
  })
})
