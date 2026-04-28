'use client'

/**
 * AppShell — abstraction component on top of `<AppLayout>` compound.
 *
 * Enforces the canonical SaaS app chrome (logo + nav + auth actions in header,
 * link columns + brand block in footer) so every internal product (ezauth,
 * ezpay, future services) stays visually identical without each app
 * re-composing the same 150-line shell.
 *
 * The `LinkComponent` prop lets consumers inject their locale-aware Link
 * wrapper (e.g. `next-intl`'s `<Link>`); when omitted the component falls back
 * to a plain `<a>` so it stays agnostic and publishable standalone.
 *
 * Naming follows Mantine/Chakra conventions: `<AppShell>` is the standard
 * primitive name for "header + main + footer" layout abstractions.
 */

import * as React from 'react'

import { Img } from '../media/img'
import { Div, Span } from '../tag'
import {
  AppActions,
  AppFooter,
  AppHeader,
  AppLayout,
  AppLogo,
  AppMain,
  AppMobileLink,
  AppMobileMenu,
  AppMobileToggle,
  AppNav,
  AppNavLink,
  FooterBrand,
  FooterColumn,
} from './app-layout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** App brand identity (logo asset + display name). */
export interface AppShellBrand {
  /** Display name (e.g. "EZAuth", "EZPay"). */
  name: string
  /** Logo asset URL (relative path or absolute URL). */
  logoSrc: string
  /** Accessible alt text — defaults to `name`. */
  logoAlt?: string
}

/** Top-nav link entry — `href` is consumer-relative (locale prefix added by `LinkComponent`). */
export interface AppShellNavLink {
  href: string
  label: string
}

/** Footer column with title + link list. */
export interface AppShellFooterColumn {
  title: string
  links: { href: string; label: string }[]
}

/** Footer brand block (tagline + copyright text). */
export interface AppShellFooterBrand {
  tagline: string
  copyright: string
}

/** Minimal Link contract — accepts `href` + `children` and an optional `className`. */
export interface AppShellLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export interface AppShellProps {
  /** App brand identity (logo + name). Rendered in header logo + footer brand. */
  brand: AppShellBrand
  /** Top nav links — rendered in `<AppNav>` (desktop) AND `<AppMobileMenu>`. */
  navLinks: AppShellNavLink[]
  /** Footer link columns (typically Product / Company / Legal). */
  footerColumns: AppShellFooterColumn[]
  /** Footer brand block (tagline + copyright). */
  footerBrand: AppShellFooterBrand
  /**
   * Right-side action slot: usually `<LocaleSwitcher>`, `<ThemeSwitcher>`,
   * `<UserMenu>` or `<LoginButton>`. Rendered in both the desktop actions zone
   * and the mobile drawer footer.
   */
  authActions?: React.ReactNode
  /**
   * Always-visible action slot rendered to the LEFT of the mobile burger
   * toggle (desktop : rendered inline with `authActions`). Use for the
   * primary identity affordance (`<UserMenu>`) so it stays a single tap
   * away on mobile instead of being buried inside the burger drawer —
   * Stripe / Clerk / Vercel pattern.
   *
   * Anything passed here is ALSO hidden from the drawer to avoid duplication.
   */
  persistentActions?: React.ReactNode
  /**
   * Locale-aware Link component (e.g. from `next-intl/navigation`). Receives
   * `{ href, children, className? }`. Defaults to `<a>` for agnostic usage.
   *
   * @example
   * import { Link } from '@/i18n/navigation'
   * <AppShell LinkComponent={Link} ... />
   */
  LinkComponent?: React.ComponentType<AppShellLinkProps>
  /**
   * Header rendering mode :
   *
   * - `'sticky'` (default) — header stays in flow, takes `h-16`, `sticky top-0`,
   *   `bg-background/80 backdrop-blur`. Content below starts AFTER the header.
   * - `'overlay'` — header is positioned `absolute top-0` (NOT in flow),
   *   transparent background, no border. Lets the FIRST page section render
   *   full-viewport UNDER the header (hero with `100vh`, image background,
   *   video background). Apply when the immediately-following content has its
   *   own dark/textured background that contrasts with the header text — pair
   *   with `<LandingHero variant="full" backgroundSlot={...} />` for immersive
   *   Linear / Vercel / Framer-style heroes.
   *
   * @default 'sticky'
   */
  headerMode?: 'sticky' | 'overlay'
  /** Page content rendered inside `<AppMain>`. */
  children: React.ReactNode
}

// ---------------------------------------------------------------------------
// Default LinkComponent — plain anchor (kept agnostic).
// ---------------------------------------------------------------------------

function DefaultLink({ href, children, className }: AppShellLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppShell({
  brand,
  navLinks,
  footerColumns,
  footerBrand,
  authActions,
  persistentActions,
  LinkComponent = DefaultLink,
  headerMode = 'sticky',
  children,
}: AppShellProps) {
  const logoAlt = brand.logoAlt ?? brand.name

  return (
    <AppLayout>
      {/* ----- Header ----- */}
      <AppHeader mode={headerMode}>
        <AppLogo asChild>
          <LinkComponent href="/">
            <Img src={brand.logoSrc} alt={logoAlt} width={28} height={28} />
            <Span className="text-lg font-bold tracking-tight">{brand.name}</Span>
          </LinkComponent>
        </AppLogo>

        <AppNav>
          {navLinks.map(link => (
            <AppNavLink key={link.href} asChild>
              <LinkComponent href={link.href}>{link.label}</LinkComponent>
            </AppNavLink>
          ))}
        </AppNav>

        <AppActions>
          <Div className="hidden items-center gap-2 md:flex">{authActions}</Div>
          <AppMobileToggle />
          {persistentActions ? (
            <Div className="flex items-center gap-2">{persistentActions}</Div>
          ) : null}
        </AppActions>

        <AppMobileMenu>
          {navLinks.map(link => (
            <AppMobileLink key={link.href} asChild>
              <LinkComponent href={link.href}>{link.label}</LinkComponent>
            </AppMobileLink>
          ))}
          {authActions ? (
            <Div className="flex flex-wrap items-center justify-end gap-2 px-3 pt-2">
              {authActions}
            </Div>
          ) : null}
        </AppMobileMenu>
      </AppHeader>

      {/* ----- Main ----- */}
      <AppMain>{children}</AppMain>

      {/* ----- Footer ----- */}
      <AppFooter>
        <Div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map(column => (
            <FooterColumn key={column.title} title={column.title}>
              {column.links.map(link => (
                <li key={link.href}>
                  <LinkComponent
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </LinkComponent>
                </li>
              ))}
            </FooterColumn>
          ))}
          <FooterBrand tagline={footerBrand.tagline} copyright={footerBrand.copyright}>
            <Div className="flex items-center gap-2">
              <Img src={brand.logoSrc} alt={logoAlt} width={24} height={24} />
              <Span className="text-lg font-bold">{brand.name}</Span>
            </Div>
          </FooterBrand>
        </Div>
      </AppFooter>
    </AppLayout>
  )
}

AppShell.displayName = 'AppShell'
