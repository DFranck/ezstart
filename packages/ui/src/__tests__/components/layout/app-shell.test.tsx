import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as React from 'react'

import { AppShell } from '../../../components/layout/app-shell'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const brand = { name: 'Acme', logoSrc: '/logo.svg' }

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
]

const footerColumns = [
  {
    title: 'Product',
    links: [
      { href: '/docs', label: 'Docs' },
      { href: '/changelog', label: 'Changelog' },
    ],
  },
  {
    title: 'Legal',
    links: [{ href: '/privacy', label: 'Privacy' }],
  },
]

const footerBrand = { tagline: 'Tagline here', copyright: '© 2026 Acme' }

// ---------------------------------------------------------------------------
// Default rendering — agnostic <a> fallback
// ---------------------------------------------------------------------------

describe('AppShell — default LinkComponent', () => {
  it('renders brand name + logo in header and footer', () => {
    render(
      <AppShell
        brand={brand}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
      >
        <div data-testid="page-content">Hello</div>
      </AppShell>
    )

    // Brand name appears twice (header logo + footer brand)
    expect(screen.getAllByText('Acme').length).toBe(2)
    // Logo image rendered with alt fallback to brand name, twice
    const logos = screen.getAllByAltText('Acme')
    expect(logos.length).toBe(2)
    expect(logos[0]).toHaveAttribute('src', '/logo.svg')
  })

  it('renders all nav links as anchors with the right hrefs', () => {
    render(
      <AppShell
        brand={brand}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
      >
        <div>content</div>
      </AppShell>
    )

    // Desktop nav (hidden on mobile via CSS but rendered)
    const features = screen.getAllByText('Features')[0]
    expect(features.tagName).toBe('A')
    expect(features).toHaveAttribute('href', '/features')

    const pricing = screen.getAllByText('Pricing')[0]
    expect(pricing).toHaveAttribute('href', '/pricing')
  })

  it('renders footer columns with link items wrapped in <li>', () => {
    render(
      <AppShell
        brand={brand}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
      >
        <div>content</div>
      </AppShell>
    )

    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()

    const docsLink = screen.getByText('Docs')
    expect(docsLink.tagName).toBe('A')
    expect(docsLink).toHaveAttribute('href', '/docs')
    expect(docsLink.parentElement?.tagName).toBe('LI')
  })

  it('renders the footer tagline + copyright', () => {
    render(
      <AppShell
        brand={brand}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
      >
        <div>content</div>
      </AppShell>
    )

    expect(screen.getByText('Tagline here')).toBeInTheDocument()
    expect(screen.getByText('© 2026 Acme')).toBeInTheDocument()
  })

  it('renders authActions slot in the desktop actions zone', () => {
    render(
      <AppShell
        brand={brand}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
        authActions={<button data-testid="cta">Sign in</button>}
      >
        <div>content</div>
      </AppShell>
    )

    // authActions is rendered (twice in the DOM: desktop slot + mobile drawer
    // slot — but mobile drawer only renders when menu is open).
    const ctas = screen.getAllByTestId('cta')
    expect(ctas.length).toBeGreaterThanOrEqual(1)
  })

  it('uses logoAlt when provided, falls back to brand.name otherwise', () => {
    render(
      <AppShell
        brand={{ ...brand, logoAlt: 'Acme custom alt' }}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
      >
        <div>content</div>
      </AppShell>
    )

    expect(screen.getAllByAltText('Acme custom alt').length).toBe(2)
  })

  it('renders the children inside the main content area', () => {
    render(
      <AppShell
        brand={brand}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
      >
        <div data-testid="page-content">Hello world</div>
      </AppShell>
    )

    const main = screen.getByTestId('page-content')
    expect(main).toBeInTheDocument()
    expect(main.closest('main')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Custom LinkComponent injection
// ---------------------------------------------------------------------------

describe('AppShell — custom LinkComponent', () => {
  it('uses the injected LinkComponent for nav and footer links', () => {
    function FakeLink({
      href,
      children,
      className,
    }: {
      href: string
      children: React.ReactNode
      className?: string
    }) {
      return (
        <a href={href} className={className} data-testid={`fake-${href}`}>
          {children}
        </a>
      )
    }

    render(
      <AppShell
        brand={brand}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
        LinkComponent={FakeLink}
      >
        <div>content</div>
      </AppShell>
    )

    expect(screen.getAllByTestId('fake-/features').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId('fake-/docs')).toHaveAttribute('href', '/docs')
    // Brand logo wraps a Link to "/"
    expect(screen.getAllByTestId('fake-/').length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// Mobile menu — toggle behavior
// ---------------------------------------------------------------------------

describe('AppShell — mobile menu', () => {
  it('renders the mobile drawer with nav links + auth actions when toggled open', () => {
    render(
      <AppShell
        brand={brand}
        navLinks={navLinks}
        footerColumns={footerColumns}
        footerBrand={footerBrand}
        authActions={<button data-testid="cta">Sign in</button>}
      >
        <div>content</div>
      </AppShell>
    )

    // Toggle hamburger
    const toggle = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(toggle)

    // Now the mobile drawer is rendered: nav links appear twice in the DOM
    // (desktop AppNav + mobile AppMobileMenu), and auth actions appear twice.
    expect(screen.getAllByText('Features').length).toBe(2)
    expect(screen.getAllByTestId('cta').length).toBe(2)
  })
})
