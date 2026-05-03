/**
 * Tests for Stripe Connect components: ConnectStatusCard, ConnectOnboardForm, ConnectFeeSummary
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  uiComponentsMock,
  loggerMock,
  sonnerMock,
  uiUtilsMock,
  nextImageMock,
  nextNavigationMock,
} from './component-mocks.js'
import { setupFetchMock, makeConnectedAccount } from '../helpers.js'
import { PayProvider } from '../../react/pay-provider.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { ConnectStatusCard } = await import('../../components/ConnectStatusCard.js')
const { ConnectOnboardForm } = await import('../../components/ConnectOnboardForm.js')
const { ConnectFeeSummary } = await import('../../components/ConnectFeeSummary.js')

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
      {children}
    </PayProvider>
  )
}

// ---------------------------------------------------------------------------
// ConnectStatusCard
// ---------------------------------------------------------------------------

describe('ConnectStatusCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders account info with default texts', () => {
    const account = makeConnectedAccount()
    const onOpenDashboard = vi.fn()
    const onDisconnect = vi.fn()

    render(
      <Wrapper>
        <ConnectStatusCard
          account={account}
          onOpenDashboard={onOpenDashboard}
          onDisconnect={onDisconnect}
        />
      </Wrapper>
    )

    expect(screen.getByText('Connected Account')).toBeInTheDocument()
    expect(screen.getByText('Test Business')).toBeInTheDocument()
    expect(screen.getByText('Standard')).toBeInTheDocument()
  })

  it('renders with custom texts', () => {
    const account = makeConnectedAccount()

    render(
      <Wrapper>
        <ConnectStatusCard
          account={account}
          onOpenDashboard={vi.fn()}
          onDisconnect={vi.fn()}
          texts={{
            title: 'Mon Compte',
            businessName: 'Nom entreprise',
            accountTypeStandard: 'Standard FR',
          }}
        />
      </Wrapper>
    )

    expect(screen.getByText('Mon Compte')).toBeInTheDocument()
    expect(screen.getByText('Nom entreprise')).toBeInTheDocument()
    expect(screen.getByText('Standard FR')).toBeInTheDocument()
  })

  it('calls onOpenDashboard when button clicked', () => {
    const account = makeConnectedAccount({ status: 'active' })
    const onOpenDashboard = vi.fn()

    render(
      <Wrapper>
        <ConnectStatusCard
          account={account}
          onOpenDashboard={onOpenDashboard}
          onDisconnect={vi.fn()}
        />
      </Wrapper>
    )

    const dashboardButton = screen.getByText('Open Dashboard')
    fireEvent.click(dashboardButton)
    expect(onOpenDashboard).toHaveBeenCalledTimes(1)
  })

  it('calls onDisconnect when button clicked', () => {
    const account = makeConnectedAccount()
    const onDisconnect = vi.fn()

    render(
      <Wrapper>
        <ConnectStatusCard
          account={account}
          onOpenDashboard={vi.fn()}
          onDisconnect={onDisconnect}
        />
      </Wrapper>
    )

    const disconnectButton = screen.getByText('Disconnect')
    fireEvent.click(disconnectButton)
    expect(onDisconnect).toHaveBeenCalledTimes(1)
  })

  it('disables dashboard button when status is not active', () => {
    const account = makeConnectedAccount({ status: 'pending' })

    render(
      <Wrapper>
        <ConnectStatusCard account={account} onOpenDashboard={vi.fn()} onDisconnect={vi.fn()} />
      </Wrapper>
    )

    const dashboardButton = screen.getByText('Open Dashboard')
    expect(dashboardButton.closest('button')).toBeDisabled()
  })

  it('shows express account type label', () => {
    const account = makeConnectedAccount({ accountType: 'express' })

    render(
      <Wrapper>
        <ConnectStatusCard account={account} onOpenDashboard={vi.fn()} onDisconnect={vi.fn()} />
      </Wrapper>
    )

    expect(screen.getByText('Express')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ConnectOnboardForm
// ---------------------------------------------------------------------------

describe('ConnectOnboardForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders form with default texts', () => {
    render(
      <Wrapper>
        <ConnectOnboardForm onSubmit={vi.fn()} />
      </Wrapper>
    )

    expect(screen.getByText('Connect with Stripe')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Business Name')).toBeInTheDocument()
  })

  it('renders with custom texts', () => {
    render(
      <Wrapper>
        <ConnectOnboardForm
          onSubmit={vi.fn()}
          texts={{ title: 'Connexion Stripe', emailLabel: 'Courriel' }}
        />
      </Wrapper>
    )

    expect(screen.getByText('Connexion Stripe')).toBeInTheDocument()
    expect(screen.getByText('Courriel')).toBeInTheDocument()
  })

  it('calls onSubmit with form data', () => {
    const onSubmit = vi.fn()

    render(
      <Wrapper>
        <ConnectOnboardForm onSubmit={onSubmit} />
      </Wrapper>
    )

    const emailInput = screen.getByPlaceholderText('your@email.com')
    const businessInput = screen.getByPlaceholderText('Your Business')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(businessInput, { target: { value: 'My Business' } })

    const submitButton = screen.getByText('Start Onboarding')
    fireEvent.click(submitButton)

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      businessName: 'My Business',
      type: 'standard',
    })
  })

  it('shows submitting text when isSubmitting is true', () => {
    render(
      <Wrapper>
        <ConnectOnboardForm onSubmit={vi.fn()} isSubmitting />
      </Wrapper>
    )

    expect(screen.getByText('Submitting...')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ConnectFeeSummary
// ---------------------------------------------------------------------------

describe('ConnectFeeSummary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders fee data with default texts', () => {
    render(
      <Wrapper>
        <ConnectFeeSummary totalFees={150.5} averageFeePercent={3.5} transactionCount={42} />
      </Wrapper>
    )

    expect(screen.getByText('Fee Summary')).toBeInTheDocument()
    expect(screen.getByText('$150.50')).toBeInTheDocument()
    expect(screen.getByText('3.5%')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders with custom texts', () => {
    render(
      <Wrapper>
        <ConnectFeeSummary
          totalFees={0}
          averageFeePercent={5}
          transactionCount={0}
          texts={{ title: 'Frais', totalFees: 'Total', averageFee: 'Moyenne' }}
        />
      </Wrapper>
    )

    expect(screen.getByText('Frais')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Moyenne')).toBeInTheDocument()
  })

  it('formats zero values correctly', () => {
    render(
      <Wrapper>
        <ConnectFeeSummary totalFees={0} averageFeePercent={0} transactionCount={0} />
      </Wrapper>
    )

    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.getByText('0.0%')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
