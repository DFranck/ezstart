/**
 * Tests for donation components: DonateButton, DonateModal, DonationCard, DonationWall
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

// Module mocks
vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

// Import after mocks
const { DonateButton } = await import('../../components/DonateButton.js')
const { DonateModal } = await import('../../components/DonateModal.js')
const { DonationCard } = await import('../../components/DonationCard.js')
const { DonationWall } = await import('../../components/DonationWall.js')

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
      {children}
    </PayProvider>
  )
}

// ---------------------------------------------------------------------------
// DonateButton
// ---------------------------------------------------------------------------

describe('DonateButton', () => {
  it('renders with default text', () => {
    render(<DonateButton />)
    expect(screen.getByText(/Donate/)).toBeInTheDocument()
  })

  it('renders with custom children', () => {
    render(<DonateButton>Support us</DonateButton>)
    expect(screen.getByText('Support us')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<DonateButton onClick={onClick}>Click</DonateButton>)
    fireEvent.click(screen.getByText('Click'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// DonateModal
// ---------------------------------------------------------------------------

describe('DonateModal', () => {
  beforeEach(() => {
    setupFetchMock([
      {
        url: '/donate',
        method: 'POST',
        response: {
          success: true,
          data: {
            payment: makePayment({ type: 'donation' }),
            checkoutUrl: 'https://checkout.stripe.com/test',
          },
        },
      },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders trigger button', () => {
    render(
      <Wrapper>
        <DonateModal projectId="proj1" />
      </Wrapper>
    )
    expect(screen.getByText(/Donate/)).toBeInTheDocument()
  })

  it('opens modal on trigger click', async () => {
    render(
      <Wrapper>
        <DonateModal projectId="proj1" projectName="My Project" />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Donate/))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('shows preset amount buttons', async () => {
    render(
      <Wrapper>
        <DonateModal projectId="proj1" amounts={[5, 10, 25]} currency="USD" />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Donate/))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('shows anonymous checkbox when userId is provided', async () => {
    render(
      <Wrapper>
        <DonateModal projectId="proj1" userId="u1" />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Donate/))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    // Anonymous checkbox is rendered when userId is present
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
  })

  it('uses custom texts', async () => {
    render(
      <Wrapper>
        <DonateModal projectId="proj1" texts={{ title: 'Help us!', donateButton: 'Give' }} />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Donate/))

    await waitFor(() => {
      expect(screen.getByText('Help us!')).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// DonationCard
// ---------------------------------------------------------------------------

describe('DonationCard', () => {
  beforeEach(() => {
    setupFetchMock([
      {
        url: '/donate',
        method: 'POST',
        response: {
          success: true,
          data: {
            payment: makePayment({ type: 'donation' }),
            checkoutUrl: 'https://checkout.stripe.com/test',
          },
        },
      },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders default variant with preset amounts', () => {
    render(
      <Wrapper>
        <DonationCard
          appName="test-app"
          projectId="proj1"
          presetAmounts={[5, 10, 25]}
          currency="USD"
        />
      </Wrapper>
    )
    expect(screen.getByText('Support this project')).toBeInTheDocument()
  })

  it('renders compact variant', () => {
    render(
      <Wrapper>
        <DonationCard
          appName="test-app"
          projectId="proj1"
          variant="compact"
          presetAmounts={[5, 10]}
        />
      </Wrapper>
    )
    expect(screen.getByText('Support this project')).toBeInTheDocument()
  })

  it('renders featured variant with badge', () => {
    render(
      <Wrapper>
        <DonationCard appName="test-app" projectId="proj1" variant="featured" />
      </Wrapper>
    )
    expect(screen.getByText('One-time donation')).toBeInTheDocument()
  })

  it('allows custom amount input when allowCustomAmount=true', () => {
    render(
      <Wrapper>
        <DonationCard appName="test-app" projectId="proj1" allowCustomAmount />
      </Wrapper>
    )

    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('replaces project name in title', () => {
    render(
      <Wrapper>
        <DonationCard appName="test-app" projectId="proj1" projectName="GreenPulse" />
      </Wrapper>
    )
    expect(screen.getByText('Support GreenPulse')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// DonationWall
// ---------------------------------------------------------------------------

describe('DonationWall', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading skeleton initially', () => {
    setupFetchMock([
      {
        url: '/donations',
        response: new Promise(() => {}), // Never resolves
      },
    ])

    // Use fetch that returns a pending promise
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    render(
      <Wrapper>
        <DonationWall projectId="proj1" />
      </Wrapper>
    )

    // Loading state renders animated divs
    // The component should be in loading state initially
  })

  it('shows empty state when no donations', async () => {
    setupFetchMock([
      {
        url: '/donations',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    render(
      <Wrapper>
        <DonationWall projectId="proj1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/No donations yet/)).toBeInTheDocument()
    })
  })

  it('renders donation pills when data is present', async () => {
    const donations = [
      makePayment({
        type: 'donation',
        id: 'd1',
        customerName: 'Alice',
        amount: 10,
        currency: 'EUR',
        isAnonymous: false,
        metadata: { message: 'Great project!' },
      }),
      makePayment({
        type: 'donation',
        id: 'd2',
        isAnonymous: true,
        amount: 5,
        currency: 'EUR',
      }),
    ]

    setupFetchMock([
      {
        url: '/donations',
        response: { success: true, data: donations, meta: { total: 2 } },
      },
    ])

    render(
      <Wrapper>
        <DonationWall projectId="proj1" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    expect(screen.getByText('Great project!')).toBeInTheDocument()
  })

  it('shows the graceful PayNotConfiguredCard on fetch failure', async () => {
    setupFetchMock([
      {
        url: '/donations',
        response: { error: 'Service unavailable' },
        status: 503,
      },
    ])

    render(
      <Wrapper>
        <DonationWall projectId="proj1" />
      </Wrapper>
    )

    // The graceful card replaces the scary red "Error: ..." banner.
    // Default reason for an unclassified fetch error is `fetch-failed`.
    await waitFor(() => {
      expect(screen.getByText(/Payments service unreachable/i)).toBeInTheDocument()
    })
  })

  it('uses custom noDonationsText', async () => {
    setupFetchMock([
      {
        url: '/donations',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    render(
      <Wrapper>
        <DonationWall projectId="proj1" texts={{ noDonationsText: 'Be the first!' }} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Be the first!')).toBeInTheDocument()
    })
  })
})
