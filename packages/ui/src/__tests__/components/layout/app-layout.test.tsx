import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as React from 'react'

import {
  AppLayout,
  AppHeader,
  AppLogo,
  AppNav,
  AppNavLink,
  AppMobileMenu,
  AppMobileToggle,
  AppMobileLink,
} from '../../../components/layout/app-layout'

// ---------------------------------------------------------------------------
// AppNavLink — asChild slot pattern
// ---------------------------------------------------------------------------

describe('AppNavLink', () => {
  it('renders a native <a> when asChild is omitted', () => {
    render(<AppNavLink href="/docs">Docs</AppNavLink>)
    const link = screen.getByText('Docs')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/docs')
    expect(link).toHaveAttribute('data-slot', 'app-nav-link')
  })

  it('applies the active aria-current and active variant classes', () => {
    render(
      <AppNavLink href="/docs" active>
        Docs
      </AppNavLink>
    )
    const link = screen.getByText('Docs')
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link.className).toMatch(/text-foreground/)
  })

  it('renders the child element when asChild is true and merges props', () => {
    function FakeLink({
      href,
      className,
      children,
      ...rest
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
      return (
        <a href={href} className={className} data-testid="fake-link" {...rest}>
          {children}
        </a>
      )
    }

    render(
      <AppNavLink asChild active className="extra-class">
        <FakeLink href="/dashboard">Dashboard</FakeLink>
      </AppNavLink>
    )

    const link = screen.getByTestId('fake-link')
    // Slot copies the parent props onto the child
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/dashboard')
    expect(link).toHaveAttribute('data-slot', 'app-nav-link')
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link.className).toMatch(/extra-class/)
    // Only one DOM element rendered (no wrapping <a>)
    expect(screen.queryAllByText('Dashboard')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// AppMobileLink — asChild slot pattern + auto-close
// ---------------------------------------------------------------------------

describe('AppMobileLink', () => {
  function renderWithOpenMenu(node: React.ReactNode) {
    function Wrapper() {
      // We need to open the menu first by clicking the toggle
      return (
        <AppLayout>
          <AppHeader>
            <AppLogo>Brand</AppLogo>
            <AppNav>{/* no nav links */}</AppNav>
            <AppMobileToggle />
          </AppHeader>
          <AppMobileMenu>{node}</AppMobileMenu>
        </AppLayout>
      )
    }
    const utils = render(<Wrapper />)
    fireEvent.click(screen.getByLabelText('Open menu'))
    return utils
  }

  it('renders a native <a> when asChild is omitted', () => {
    renderWithOpenMenu(<AppMobileLink href="/docs">Docs</AppMobileLink>)
    const link = screen.getByText('Docs')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/docs')
    expect(link).toHaveAttribute('data-slot', 'app-mobile-link')
  })

  it('renders the child element when asChild is true', () => {
    function FakeLink({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
      return (
        <a href={href} data-testid="fake-mobile-link" {...rest}>
          {children}
        </a>
      )
    }

    renderWithOpenMenu(
      <AppMobileLink asChild active>
        <FakeLink href="/dashboard">Dashboard</FakeLink>
      </AppMobileLink>
    )
    const link = screen.getByTestId('fake-mobile-link')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/dashboard')
    expect(link).toHaveAttribute('data-slot', 'app-mobile-link')
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('closes the mobile menu when the link is clicked (asChild=false)', () => {
    renderWithOpenMenu(<AppMobileLink href="/docs">Docs</AppMobileLink>)
    const link = screen.getByText('Docs')
    expect(link).toBeInTheDocument()

    fireEvent.click(link)

    // After click, the mobile menu unmounts so the link is gone
    expect(screen.queryByText('Docs')).not.toBeInTheDocument()
  })

  it('closes the mobile menu when the slotted child is clicked (asChild=true) and still calls the child onClick', () => {
    const childOnClick = vi.fn()
    function FakeLink({
      href,
      children,
      onClick,
      ...rest
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
      return (
        <a href={href} data-testid="fake-mobile-link" onClick={onClick} {...rest}>
          {children}
        </a>
      )
    }

    renderWithOpenMenu(
      <AppMobileLink asChild>
        <FakeLink href="/dashboard" onClick={childOnClick}>
          Dashboard
        </FakeLink>
      </AppMobileLink>
    )

    const link = screen.getByTestId('fake-mobile-link')
    fireEvent.click(link)

    expect(childOnClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('fake-mobile-link')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AppLogo — asChild slot pattern
// ---------------------------------------------------------------------------

describe('AppLogo', () => {
  it('renders a <div> by default', () => {
    render(<AppLogo>Brand</AppLogo>)
    const logo = screen.getByText('Brand')
    expect(logo.tagName).toBe('DIV')
    expect(logo).toHaveAttribute('data-slot', 'app-logo')
  })

  it('renders the child element when asChild is true', () => {
    render(
      <AppLogo asChild>
        <a href="/" data-testid="logo-link">
          Brand
        </a>
      </AppLogo>
    )
    const link = screen.getByTestId('logo-link')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveAttribute('data-slot', 'app-logo')
  })
})
