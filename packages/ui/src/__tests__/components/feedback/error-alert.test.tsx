/**
 * ErrorAlert — public surface tests.
 *
 * Pin the contract for the destructive alert wrapper exposed by
 * `@ezstart/ui/components`. Originally extracted from
 * `@ezstart/auth-sdk` (`AuthErrorBanner`) — now generic and reusable
 * across all consumer apps and SDKs.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ErrorAlert } from '../../../components/feedback/error-alert'

describe('ErrorAlert', () => {
  it('renders the error message passed via children', () => {
    render(<ErrorAlert>Invalid credentials</ErrorAlert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Invalid credentials')
  })

  it('renders complex ReactNode children (rich content, links, etc.)', () => {
    render(
      <ErrorAlert>
        <span data-testid="rich-child">Reset your password</span>
      </ErrorAlert>
    )
    expect(screen.getByTestId('rich-child')).toBeInTheDocument()
  })

  it('still renders the alert wrapper when children is null/false (consumer guard up to caller)', () => {
    // The component itself does not short-circuit on falsy children — the
    // caller is responsible for the conditional render. We simply assert the
    // alert wrapper is present so styling/role contract holds either way.
    render(<ErrorAlert>{null}</ErrorAlert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('uses the default English aria-label when no texts override is provided', () => {
    render(<ErrorAlert>Boom</ErrorAlert>)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-label', 'Error')
  })

  it('honours the texts prop override (i18n hook-in point)', () => {
    render(
      <ErrorAlert texts={{ ariaLabel: 'Erreur d’authentification' }}>
        Identifiants invalides
      </ErrorAlert>
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-label', 'Erreur d’authentification')
    expect(alert).toHaveTextContent('Identifiants invalides')
  })

  it('appends the custom className to the wrapper', () => {
    render(<ErrorAlert className="mt-4 custom-x">err</ErrorAlert>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('mt-4')
    expect(alert.className).toContain('custom-x')
    // Default destructive styling is preserved
    expect(alert.className).toContain('bg-destructive/15')
  })
})
