/**
 * AuthErrorBanner — deprecated re-export contract test.
 *
 * The component was moved to `@ezstart/ui` as `ErrorAlert` (2026-05-01).
 * The auth-sdk surface is preserved for 90 days as a deprecated re-export
 * (planned removal 2026-08-01). This test pins the contract that the
 * re-export keeps producing the same accessible alert markup so consumers
 * can migrate at their own pace.
 *
 * The exhaustive behaviour suite lives in
 * `@ezstart/ui/__tests__/components/feedback/error-alert.test.tsx`.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

const { AuthErrorBanner } = await import('../../components/auth-error-banner.js')

describe('AuthErrorBanner (deprecated re-export)', () => {
  it('renders the error message via children (backward-compat surface)', () => {
    render(<AuthErrorBanner>Invalid credentials</AuthErrorBanner>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Invalid credentials')
  })

  it('honours the texts prop override (i18n hook-in stays compatible)', () => {
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
    expect(alert.className).toContain('bg-destructive/15')
  })
})
