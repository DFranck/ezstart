/**
 * ScopeContextIndicator — deprecated re-export contract test.
 *
 * The component was moved to `@ezstart/ui` as `ScopeContextSwitcher`
 * (2026-05-01). The auth-sdk surface is preserved for 90 days as a
 * deprecated re-export (planned removal 2026-08-01). This test pins the
 * contract that the re-export keeps producing the same accessible markup
 * so consumers can migrate at their own pace.
 *
 * The exhaustive behaviour suite lives in
 * `@ezstart/ui/__tests__/components/navigation/scope-context-switcher.test.tsx`.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

const { ScopeContextIndicator } = await import('../../components/scope-context-indicator.js')

describe('ScopeContextIndicator (deprecated re-export)', () => {
  it('renders user scope with the default "Personal account" label', () => {
    render(<ScopeContextIndicator scope="user" canSwitchToAdmin={false} switchPath="/admin" />)
    expect(screen.getByLabelText('Personal account')).toBeInTheDocument()
    expect(document.querySelector('[data-scope="user"]')).not.toBeNull()
  })

  it('renders admin scope with the default "Platform admin" label', () => {
    render(<ScopeContextIndicator scope="admin" canSwitchToAdmin={false} switchPath="/dashboard" />)
    expect(screen.getByLabelText('Platform admin')).toBeInTheDocument()
    expect(document.querySelector('[data-scope="admin"]')).not.toBeNull()
  })

  it('renders the toggle when canSwitchToAdmin=true', () => {
    render(<ScopeContextIndicator scope="user" canSwitchToAdmin switchPath="/en/admin" />)
    expect(screen.getByText('Switch to admin')).toBeInTheDocument()
    expect(document.querySelector('a[href="/en/admin"]')).not.toBeNull()
  })

  it('honours the texts prop override (i18n hook-in stays compatible)', () => {
    render(
      <ScopeContextIndicator
        scope="admin"
        canSwitchToAdmin
        switchPath="/fr/dashboard"
        texts={{ adminMode: 'Admin plateforme', switchToUser: 'Revenir au personnel' }}
      />
    )
    expect(screen.getByLabelText('Admin plateforme')).toBeInTheDocument()
    expect(screen.getByText('Revenir au personnel')).toBeInTheDocument()
  })
})
