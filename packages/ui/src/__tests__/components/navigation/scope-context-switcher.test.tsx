/**
 * ScopeContextSwitcher — public surface tests.
 *
 * Pin the contract for the Stripe-pattern role/scope toggle exposed by
 * `@ezstart/ui/components`. Originally extracted from
 * `@ezstart/auth-sdk` (`ScopeContextIndicator`) — now generic and reusable
 * across all consumer apps and SDKs.
 */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { ScopeContextSwitcher } from '../../../components/navigation/scope-context-switcher'

describe('ScopeContextSwitcher', () => {
  it('renders user scope with "Personal account" label and User icon', () => {
    render(<ScopeContextSwitcher scope="user" canSwitchToAdmin={false} switchPath="/admin" />)
    const badge = screen.getByLabelText('Personal account')
    expect(badge).toBeInTheDocument()
    const wrapper = document.querySelector('[data-scope="user"]')
    expect(wrapper).not.toBeNull()
  })

  it('renders admin scope with "Platform admin" label and Shield icon', () => {
    render(<ScopeContextSwitcher scope="admin" canSwitchToAdmin={false} switchPath="/dashboard" />)
    const badge = screen.getByLabelText('Platform admin')
    expect(badge).toBeInTheDocument()
    const wrapper = document.querySelector('[data-scope="admin"]')
    expect(wrapper).not.toBeNull()
  })

  it('does not render the toggle when canSwitchToAdmin=false', () => {
    render(<ScopeContextSwitcher scope="user" canSwitchToAdmin={false} switchPath="/admin" />)
    expect(screen.queryByText('Switch to admin')).not.toBeInTheDocument()
    expect(screen.queryByText('Switch to personal')).not.toBeInTheDocument()
  })

  it('renders the "Switch to admin" toggle when in user scope and canSwitchToAdmin=true', () => {
    render(<ScopeContextSwitcher scope="user" canSwitchToAdmin switchPath="/en/admin" />)
    const toggle = screen.getByText('Switch to admin')
    expect(toggle).toBeInTheDocument()
    const link = document.querySelector('a[href="/en/admin"]')
    expect(link).not.toBeNull()
  })

  it('renders the "Switch to personal" toggle when in admin scope and canSwitchToAdmin=true', () => {
    render(<ScopeContextSwitcher scope="admin" canSwitchToAdmin switchPath="/en/dashboard" />)
    const toggle = screen.getByText('Switch to personal')
    expect(toggle).toBeInTheDocument()
    const link = document.querySelector('a[href="/en/dashboard"]')
    expect(link).not.toBeNull()
  })

  it('uses the LinkComponent prop when provided (SPA navigation)', () => {
    const CustomLink = vi.fn(
      ({ href, children }: { href: string; children: React.ReactNode; className?: string }) => (
        <a data-testid="custom-link" href={href}>
          {children}
        </a>
      )
    )
    render(
      <ScopeContextSwitcher
        scope="user"
        canSwitchToAdmin
        switchPath="/fr/admin"
        LinkComponent={CustomLink}
      />
    )
    const customLink = screen.getByTestId('custom-link')
    expect(customLink).toHaveAttribute('href', '/fr/admin')
    expect(CustomLink).toHaveBeenCalled()
  })

  it('honours the texts prop override (i18n hook-in)', () => {
    render(
      <ScopeContextSwitcher
        scope="admin"
        canSwitchToAdmin
        switchPath="/fr/dashboard"
        texts={{
          adminMode: 'Admin plateforme',
          switchToUser: 'Revenir au personnel',
        }}
      />
    )
    expect(screen.getByLabelText('Admin plateforme')).toBeInTheDocument()
    expect(screen.getByText('Revenir au personnel')).toBeInTheDocument()
  })

  it('falls back to a plain <a> when no LinkComponent is provided', () => {
    render(<ScopeContextSwitcher scope="user" canSwitchToAdmin switchPath="/admin" />)
    const link = document.querySelector('a[href="/admin"]')
    expect(link).not.toBeNull()
    if (link) fireEvent.click(link)
  })

  it('appends the custom className to the wrapper', () => {
    render(
      <ScopeContextSwitcher
        scope="user"
        canSwitchToAdmin={false}
        switchPath="/admin"
        className="ml-4 custom-x"
      />
    )
    const wrapper = document.querySelector('[data-scope="user"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.className).toContain('ml-4')
    expect(wrapper?.className).toContain('custom-x')
  })
})
