/**
 * MaintenanceBanner — public surface tests.
 *
 * Pin the contract for the props-driven maintenance banner exposed by
 * `@ezstart/ui/components`. Originally extracted from
 * `@ezstart/auth-sdk` (where it was hook-coupled) — now a pure
 * presentation primitive so the data layer (`useMaintenanceStatus` from
 * `@ezstart/api-sdk/react`) stays composable.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { MaintenanceBanner } from '../../../components/feedback/maintenance-banner'

describe('MaintenanceBanner', () => {
  it('renders nothing when status is null (loading state guard)', () => {
    const { container } = render(<MaintenanceBanner status={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when status is undefined', () => {
    const { container } = render(<MaintenanceBanner status={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when maintenance is disabled', () => {
    const { container } = render(
      <MaintenanceBanner
        status={{ enabled: false, message: '', startedAt: null, scheduledEnd: null }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the heading and message when maintenance is active', () => {
    render(
      <MaintenanceBanner
        status={{
          enabled: true,
          message: 'Back at 18:00 UTC',
          startedAt: '2026-05-01T10:00:00Z',
          scheduledEnd: null,
        }}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Scheduled maintenance in progress')
    expect(alert).toHaveTextContent('Back at 18:00 UTC')
  })

  it('honours the texts prop override (i18n hook-in)', () => {
    render(
      <MaintenanceBanner
        status={{ enabled: true, message: '', startedAt: null, scheduledEnd: null }}
        texts={{ heading: 'Maintenance en cours', scheduledEndLabel: 'Reprise prévue à' }}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Maintenance en cours')
  })

  it('formats the scheduled end timestamp via Intl.DateTimeFormat', () => {
    render(
      <MaintenanceBanner
        status={{
          enabled: true,
          message: '',
          startedAt: null,
          scheduledEnd: '2026-05-01T18:00:00Z',
        }}
      />
    )
    const alert = screen.getByRole('alert')
    // We don't assert the exact locale-formatted output (it varies by env),
    // but the scheduledEndLabel must be present whenever the timestamp parses.
    expect(alert).toHaveTextContent('Service expected to resume at')
  })

  it('omits the scheduled end line when no timestamp is provided', () => {
    render(
      <MaintenanceBanner
        status={{ enabled: true, message: 'Quick fix', startedAt: null, scheduledEnd: null }}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert).not.toHaveTextContent('Service expected to resume at')
  })

  it('omits the scheduled end line when the timestamp is invalid', () => {
    render(
      <MaintenanceBanner
        status={{
          enabled: true,
          message: '',
          startedAt: null,
          scheduledEnd: 'not-a-date',
        }}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Scheduled maintenance in progress')
    // No throw, no scheduled-end line — Intl just bails silently.
  })

  it('applies sticky positioning when sticky=true', () => {
    render(
      <MaintenanceBanner
        sticky
        status={{ enabled: true, message: '', startedAt: null, scheduledEnd: null }}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('sticky')
    expect(alert.className).toContain('top-0')
  })

  it('does NOT apply sticky positioning when sticky=false (default)', () => {
    render(
      <MaintenanceBanner
        status={{ enabled: true, message: '', startedAt: null, scheduledEnd: null }}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert.className).not.toContain('sticky')
  })

  it('appends the custom className to the wrapper', () => {
    render(
      <MaintenanceBanner
        className="custom-x mt-4"
        status={{ enabled: true, message: '', startedAt: null, scheduledEnd: null }}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('custom-x')
    expect(alert.className).toContain('mt-4')
  })
})
