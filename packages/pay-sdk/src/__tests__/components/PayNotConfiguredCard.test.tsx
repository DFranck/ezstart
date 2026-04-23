/**
 * Tests for the <PayNotConfiguredCard /> graceful fallback — renders per
 * reason with the correct icon/title, respects the `dashboardUrl` optional,
 * honours `texts` overrides, and silences itself for `fetch-failed` in
 * production.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { uiComponentsMock } from './component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)

const { PayNotConfiguredCard, classifyPayError } =
  await import('../../components/common/PayNotConfiguredCard.js')

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

describe('PayNotConfiguredCard — rendering per reason', () => {
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
  })

  it('renders missing-key with the KeyRound icon and default English copy', () => {
    render(<PayNotConfiguredCard reason="missing-key" />)

    expect(screen.getByText('Payments not configured')).toBeInTheDocument()
    expect(screen.getByText(/This feature needs an EZPay publishable key/i)).toBeInTheDocument()
    const icon = screen
      .getAllByTestId('icon')
      .find(el => el.getAttribute('data-icon') === 'lucide:KeyRound')
    expect(icon).toBeTruthy()
  })

  it('renders resolve-failed with the AlertTriangle icon', () => {
    render(<PayNotConfiguredCard reason="resolve-failed" />)

    expect(screen.getByText(/Could not load payments context/i)).toBeInTheDocument()
    const icon = screen
      .getAllByTestId('icon')
      .find(el => el.getAttribute('data-icon') === 'lucide:AlertTriangle')
    expect(icon).toBeTruthy()
  })

  it('renders fetch-failed with the WifiOff icon (outside production)', () => {
    process.env.NODE_ENV = 'development'
    render(<PayNotConfiguredCard reason="fetch-failed" />)

    expect(screen.getByText(/Payments service unreachable/i)).toBeInTheDocument()
    const icon = screen
      .getAllByTestId('icon')
      .find(el => el.getAttribute('data-icon') === 'lucide:WifiOff')
    expect(icon).toBeTruthy()
  })

  it('renders invalid-key with the ShieldAlert icon', () => {
    render(<PayNotConfiguredCard reason="invalid-key" />)

    expect(screen.getByText(/Payments key rejected/i)).toBeInTheDocument()
    const icon = screen
      .getAllByTestId('icon')
      .find(el => el.getAttribute('data-icon') === 'lucide:ShieldAlert')
    expect(icon).toBeTruthy()
  })
})

describe('PayNotConfiguredCard — CTA button', () => {
  it('renders the CTA link when dashboardUrl is set', () => {
    render(
      <PayNotConfiguredCard
        reason="missing-key"
        dashboardUrl="https://ezpay.ezstart.xyz/en/developer"
      />
    )

    const link = screen.getByRole('link', { name: /get your key/i })
    expect(link).toHaveAttribute('href', 'https://ezpay.ezstart.xyz/en/developer')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does NOT render the CTA link when dashboardUrl is undefined', () => {
    render(<PayNotConfiguredCard reason="missing-key" />)

    const link = screen.queryByRole('link', { name: /get your key/i })
    expect(link).toBeNull()
  })

  it('does NOT render the CTA link when dashboardUrl is an empty string', () => {
    render(<PayNotConfiguredCard reason="missing-key" dashboardUrl="" />)

    const link = screen.queryByRole('link')
    expect(link).toBeNull()
  })
})

describe('PayNotConfiguredCard — texts override', () => {
  it('uses custom title / description / cta when provided', () => {
    render(
      <PayNotConfiguredCard
        reason="missing-key"
        dashboardUrl="https://example.com/dev"
        texts={{
          title: 'Custom title',
          description: 'Custom description',
          cta: 'Custom CTA',
        }}
      />
    )

    expect(screen.getByText('Custom title')).toBeInTheDocument()
    expect(screen.getByText('Custom description')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Custom CTA' })).toBeInTheDocument()
  })

  it('mixes overrides with defaults per-key', () => {
    render(
      <PayNotConfiguredCard
        reason="resolve-failed"
        dashboardUrl="https://example.com/dev"
        texts={{ title: 'Only title overridden' }}
      />
    )

    expect(screen.getByText('Only title overridden')).toBeInTheDocument()
    // Default description and CTA should still show
    expect(screen.getByText(/We could not verify your EZPay publishable key/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open developer portal/i })).toBeInTheDocument()
  })
})

describe('PayNotConfiguredCard — variant', () => {
  it('renders compact variant when requested', () => {
    render(
      <PayNotConfiguredCard
        reason="missing-key"
        dashboardUrl="https://example.com/dev"
        variant="compact"
      />
    )
    // Still shows title + CTA, but not the "full card" centered icon circle.
    expect(screen.getByText('Payments not configured')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get your key/i })).toBeInTheDocument()
  })
})

describe('PayNotConfiguredCard — silent-in-production behaviour', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production'
  })
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
  })

  it('renders a muted placeholder instead of the full card for fetch-failed in prod', () => {
    render(<PayNotConfiguredCard reason="fetch-failed" />)

    // The scary "Payments service unreachable" title must NOT appear in prod.
    expect(screen.queryByText('Payments service unreachable')).toBeNull()
    // The muted placeholder shows a generic "Temporarily unavailable." message
    // unless the consumer explicitly overrides via `texts.description`.
    expect(screen.getByText(/Temporarily unavailable/i)).toBeInTheDocument()
  })

  it('honours a custom texts.description in the silent-prod placeholder', () => {
    render(
      <PayNotConfiguredCard
        reason="fetch-failed"
        texts={{ description: 'Supporters wall temporarily unavailable.' }}
      />
    )
    expect(screen.queryByText('Payments service unreachable')).toBeNull()
    expect(screen.getByText('Supporters wall temporarily unavailable.')).toBeInTheDocument()
  })

  it('still renders the full card for non-fetch-failed reasons in production', () => {
    render(<PayNotConfiguredCard reason="missing-key" />)

    // Missing-key indicates a permanent config problem — must always surface.
    expect(screen.getByText('Payments not configured')).toBeInTheDocument()
  })

  it('allows opting out of silent-in-production via the prop', () => {
    render(<PayNotConfiguredCard reason="fetch-failed" silentInProduction={false} />)

    expect(screen.getByText('Payments service unreachable')).toBeInTheDocument()
  })

  it('allows force-silencing any reason in production via the prop', () => {
    render(<PayNotConfiguredCard reason="missing-key" silentInProduction={true} />)

    // Forcibly silenced — the loud title should not appear.
    expect(screen.queryByText('Payments not configured')).toBeNull()
  })
})

describe('classifyPayError', () => {
  it('returns invalid-key for unauthorised / forbidden / 401 messages', () => {
    expect(classifyPayError(new Error('Unauthorized'))).toBe('invalid-key')
    expect(classifyPayError(new Error('Invalid API key'))).toBe('invalid-key')
    expect(classifyPayError(new Error('Request failed with status 403'))).toBe('invalid-key')
  })

  it('returns fetch-failed for network / CORS / ECONNREFUSED messages', () => {
    expect(classifyPayError(new Error('Failed to fetch'))).toBe('fetch-failed')
    expect(classifyPayError(new Error('NetworkError when attempting to fetch'))).toBe(
      'fetch-failed'
    )
    expect(classifyPayError('ECONNREFUSED 127.0.0.1:6130')).toBe('fetch-failed')
  })

  it('returns null for unknown errors', () => {
    expect(classifyPayError(new Error('something weird'))).toBeNull()
    expect(classifyPayError(null)).toBeNull()
    expect(classifyPayError(undefined)).toBeNull()
    expect(classifyPayError('')).toBeNull()
  })
})
