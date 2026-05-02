/**
 * Tests for PromoCodeInput, RefundButton, FeatureGate, ConfirmActionDialog, PaymentHistory
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
import { setupFetchMock, makePayment } from '../helpers.js'
import { PayProvider } from '../../react/pay-provider.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('@ezstart/ui/hooks', () => ({ useDeprecationWarning: vi.fn() }))
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { PromoCodeInput } = await import('../../components/PromoCodeInput.js')
const { RefundButton } = await import('../../components/RefundButton.js')
const { FeatureGate } = await import('../../components/FeatureGate.js')
const { ConfirmActionDialog } = await import('../../components/ConfirmActionDialog.js')
const { PaymentHistory } = await import('../../components/PaymentHistory.js')

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999/api' }}>
      {children}
    </PayProvider>
  )
}

// ---------------------------------------------------------------------------
// PromoCodeInput
// ---------------------------------------------------------------------------

describe('PromoCodeInput', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders input and apply button', () => {
    render(
      <Wrapper>
        <PromoCodeInput appName="test-app" value="" onChange={() => {}} />
      </Wrapper>
    )
    expect(screen.getByPlaceholderText('Promo code')).toBeInTheDocument()
    expect(screen.getByText('Apply')).toBeInTheDocument()
  })

  it('apply button is disabled when value is empty', () => {
    render(
      <Wrapper>
        <PromoCodeInput appName="test-app" value="" onChange={() => {}} />
      </Wrapper>
    )
    const applyBtn = screen.getByText('Apply')
    expect(applyBtn).toBeDisabled()
  })

  it('calls onChange when input changes', () => {
    const onChange = vi.fn()
    render(
      <Wrapper>
        <PromoCodeInput appName="test-app" value="" onChange={onChange} />
      </Wrapper>
    )
    fireEvent.change(screen.getByPlaceholderText('Promo code'), {
      target: { value: 'SAVE20' },
    })
    expect(onChange).toHaveBeenCalledWith('SAVE20')
  })

  it('validates promo code on apply click', async () => {
    setupFetchMock([
      {
        url: '/promos/validate',
        response: {
          success: true,
          data: { valid: true, discountType: 'percent', discountValue: 20, duration: 'once' },
        },
      },
    ])

    const onValidated = vi.fn()
    render(
      <Wrapper>
        <PromoCodeInput
          appName="test-app"
          value="SAVE20"
          onChange={() => {}}
          onValidated={onValidated}
        />
      </Wrapper>
    )

    fireEvent.click(screen.getByText('Apply'))

    await waitFor(() => {
      expect(onValidated).toHaveBeenCalledWith(
        expect.objectContaining({ valid: true, discountValue: 20 })
      )
    })

    // Valid badge should show
    expect(screen.getByText('Valid')).toBeInTheDocument()
  })

  it('shows invalid badge when code is invalid', async () => {
    setupFetchMock([
      {
        url: '/promos/validate',
        response: {
          success: true,
          data: { valid: false, reason: 'Expired' },
        },
      },
    ])

    const onValidated = vi.fn()
    render(
      <Wrapper>
        <PromoCodeInput
          appName="test-app"
          value="EXPIRED"
          onChange={() => {}}
          onValidated={onValidated}
        />
      </Wrapper>
    )

    fireEvent.click(screen.getByText('Apply'))

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument()
    })

    expect(screen.getByText('Expired')).toBeInTheDocument()
  })

  it('handles validation API error', async () => {
    setupFetchMock([
      {
        url: '/promos/validate',
        response: { error: 'Server error' },
        status: 500,
      },
    ])

    render(
      <Wrapper>
        <PromoCodeInput appName="test-app" value="TEST" onChange={() => {}} />
      </Wrapper>
    )

    fireEvent.click(screen.getByText('Apply'))

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument()
    })
  })

  it('resets validation when input changes after validation', async () => {
    setupFetchMock([
      {
        url: '/promos/validate',
        response: {
          success: true,
          data: { valid: true, discountType: 'percent', discountValue: 10, duration: 'once' },
        },
      },
    ])

    const onValidated = vi.fn()
    const onChange = vi.fn()
    render(
      <Wrapper>
        <PromoCodeInput
          appName="test-app"
          value="SAVE10"
          onChange={onChange}
          onValidated={onValidated}
        />
      </Wrapper>
    )

    // Validate
    fireEvent.click(screen.getByText('Apply'))
    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument()
    })

    // Change input — should reset validation
    fireEvent.change(screen.getByPlaceholderText('Promo code'), {
      target: { value: 'NEW' },
    })
    expect(onValidated).toHaveBeenCalledWith(null)
  })

  it('uses custom texts', () => {
    render(
      <Wrapper>
        <PromoCodeInput
          appName="test-app"
          value=""
          onChange={() => {}}
          texts={{ placeholder: 'Enter code', applyButton: 'Check' }}
        />
      </Wrapper>
    )
    expect(screen.getByPlaceholderText('Enter code')).toBeInTheDocument()
    expect(screen.getByText('Check')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// RefundButton
// ---------------------------------------------------------------------------

describe('RefundButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders refund button', () => {
    render(
      <Wrapper>
        <RefundButton paymentId="pay1" />
      </Wrapper>
    )
    expect(screen.getByText('Refund')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(
      <Wrapper>
        <RefundButton paymentId="pay1" disabled />
      </Wrapper>
    )
    const btn = screen.getByText('Refund').closest('button')
    expect(btn).toBeDisabled()
  })

  it('opens confirm dialog on click', async () => {
    render(
      <Wrapper>
        <RefundButton paymentId="pay1" amount={10} currency="EUR" />
      </Wrapper>
    )

    fireEvent.click(screen.getByText('Refund'))

    await waitFor(() => {
      expect(screen.getByText('Confirm refund')).toBeInTheDocument()
    })
  })

  it('uses custom texts', () => {
    render(
      <Wrapper>
        <RefundButton paymentId="pay1" texts={{ refund: 'Return' }} />
      </Wrapper>
    )
    // 'Return' appears in both the button and the ConfirmActionDialog
    const elements = screen.getAllByText('Return')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// FeatureGate
// ---------------------------------------------------------------------------

describe('FeatureGate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when feature is available', async () => {
    const sub = makePayment({
      type: 'subscription',
      status: 'completed',
      metadata: { planName: 'Pro', features: ['analytics', 'export'] },
    })
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [sub], meta: { total: 1 } },
      },
    ])

    render(
      <Wrapper>
        <FeatureGate feature="analytics" userId="u1" appName="test-app">
          <div data-testid="gated-content">Premium content</div>
        </FeatureGate>
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('gated-content')).toBeInTheDocument()
    })
  })

  it('renders fallback when feature is NOT available', async () => {
    const sub = makePayment({
      type: 'subscription',
      status: 'completed',
      metadata: { planName: 'Basic', features: ['analytics'] },
    })
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [sub], meta: { total: 1 } },
      },
    ])

    render(
      <Wrapper>
        <FeatureGate
          feature="export"
          userId="u1"
          appName="test-app"
          fallback={<div data-testid="upgrade-cta">Upgrade to Pro</div>}
        >
          <div data-testid="gated-content">Premium content</div>
        </FeatureGate>
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('upgrade-cta')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument()
  })

  it('renders nothing when feature is not available and no fallback', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    const { container } = render(
      <Wrapper>
        <FeatureGate feature="export" userId="u1" appName="test-app">
          <div data-testid="gated-content">Premium</div>
        </FeatureGate>
      </Wrapper>
    )

    await waitFor(() => {
      // Nothing should render
      expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument()
    })
  })

  it('renders nothing while loading', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    render(
      <Wrapper>
        <FeatureGate feature="analytics" userId="u1" appName="test-app">
          <div data-testid="gated-content">Content</div>
        </FeatureGate>
      </Wrapper>
    )

    // While loading, nothing should be rendered
    expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ConfirmActionDialog
// ---------------------------------------------------------------------------

describe('ConfirmActionDialog', () => {
  it('renders confirm and cancel buttons when open', () => {
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete item?"
        description="This cannot be undone."
        onConfirm={async () => {}}
      />
    )
    expect(screen.getByText('Delete item?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('does not render content when closed (AlertDialog handles open prop)', () => {
    render(
      <ConfirmActionDialog
        open={false}
        onOpenChange={() => {}}
        title="Delete?"
        description="Gone forever"
        onConfirm={async () => {}}
      />
    )
    // The AlertDialog mock now returns null when open=false
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete?"
        description="Sure?"
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  // The stateful behaviour (success / error / loading state transitions, retry,
  // toast feedback, error detail rendering) is now covered exhaustively by
  // `@ezstart/ui/__tests__/components/feedback/confirm-action-dialog.test.tsx`
  // since the component was promoted to `@ezstart/ui` (PAY_SDK_PHASE_1_MIGRATE-001,
  // 2026-05-01). Pay-sdk re-export keeps a thin contract test below.

  it('calls onOpenChange(false) on cancel click', () => {
    const onOpenChange = vi.fn()
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete?"
        description="Sure?"
        onConfirm={async () => {}}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('uses custom text labels', () => {
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={() => {}}
        title="Custom"
        description="Custom desc"
        onConfirm={async () => {}}
        texts={{ confirmLabel: 'Yes', cancelLabel: 'No' }}
      />
    )
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PaymentHistory
// ---------------------------------------------------------------------------

describe('PaymentHistory', () => {
  it('shows loading skeleton', () => {
    render(<PaymentHistory payments={[]} loading={true} />)
    // SkeletonList should be rendered
    expect(screen.getByTestId('SkeletonList')).toBeInTheDocument()
  })

  it('shows empty state with default message', () => {
    render(<PaymentHistory payments={[]} />)
    expect(screen.getByText('No payments yet.')).toBeInTheDocument()
  })

  it('shows empty state with custom message', () => {
    render(<PaymentHistory payments={[]} emptyMessage="Nothing to show" />)
    expect(screen.getByText('Nothing to show')).toBeInTheDocument()
  })

  it('renders DataTable when payments are present', () => {
    const payments = [
      makePayment({ id: 'p1', type: 'purchase', amount: 10, status: 'completed' }),
      makePayment({ id: 'p2', type: 'donation', amount: 5, status: 'pending' }),
    ]

    render(<PaymentHistory payments={payments} />)
    expect(screen.getByTestId('data-table')).toBeInTheDocument()
  })
})
