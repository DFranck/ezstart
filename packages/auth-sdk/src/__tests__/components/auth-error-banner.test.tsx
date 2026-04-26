/**
 * AuthErrorBanner — public surface tests.
 *
 * Pin the contract for the SDK component extracted from
 * `apps/ezauth/web/src/components/AuthErrorBanner.tsx` so consumers can rely
 * on it as a stable primitive across all consumer apps.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

const { AuthErrorBanner } = await import('../../components/auth-error-banner.js')

describe('AuthErrorBanner', () => {
  it('renders the error message passed via children', () => {
    render(<AuthErrorBanner>Invalid credentials</AuthErrorBanner>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Invalid credentials')
  })

  it('renders complex ReactNode children (rich content, links, etc.)', () => {
    render(
      <AuthErrorBanner>
        <span data-testid="rich-child">Reset your password</span>
      </AuthErrorBanner>
    )
    expect(screen.getByTestId('rich-child')).toBeInTheDocument()
  })

  it('still renders the alert wrapper when children is null/false (consumer guard up to caller)', () => {
    // The component itself does not short-circuit on falsy children — the
    // caller is responsible for the conditional render. We simply assert the
    // alert wrapper is present so styling/role contract holds either way.
    render(<AuthErrorBanner>{null}</AuthErrorBanner>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('uses the default English aria-label when no texts override is provided', () => {
    render(<AuthErrorBanner>Boom</AuthErrorBanner>)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-label', 'Authentication error')
  })

  it('honours the texts prop override (i18n hook-in point)', () => {
    render(
      <AuthErrorBanner texts={{ ariaLabel: 'Erreur d’authentification' }}>
        Identifiants invalides
      </AuthErrorBanner>
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-label', 'Erreur d’authentification')
    expect(alert).toHaveTextContent('Identifiants invalides')
  })

  it('appends the custom className to the wrapper', () => {
    render(<AuthErrorBanner className="mt-4 custom-x">err</AuthErrorBanner>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('mt-4')
    expect(alert.className).toContain('custom-x')
    // Default destructive styling is preserved
    expect(alert.className).toContain('bg-destructive/15')
  })
})
