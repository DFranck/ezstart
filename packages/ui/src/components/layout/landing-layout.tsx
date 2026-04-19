'use client'

import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// --- Context — mobile menu open state shared across compound ---

interface LandingContextValue {
  /** Whether the mobile menu is open */
  menuOpen: boolean
  /** Toggle the mobile menu */
  setMenuOpen: (open: boolean) => void
}

const LandingContext = createContext<LandingContextValue | null>(null)

function useLanding() {
  const ctx = useContext(LandingContext)
  if (!ctx) {
    throw new Error('Landing compound components must be used within <LandingLayout>')
  }
  return ctx
}

// --- LandingLayout — root shell ---

/**
 * @deprecated Use `AppLayout` from `./app-layout` instead.
 * AppLayout provides a unified header + main + footer shell for ALL SaaS apps.
 * LandingHeroSection and LandingSection remain valid for content inside AppMain.
 */
function LandingLayout({ className, children, ...props }: React.ComponentProps<'div'>) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <LandingContext.Provider value={{ menuOpen, setMenuOpen }}>
      <div
        data-slot="landing-layout"
        className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}
        {...props}
      >
        {children}
      </div>
    </LandingContext.Provider>
  )
}

// --- LandingHeader ---

/**
 * @deprecated Use `AppHeader` from `./app-layout` instead.
 * AppHeader is the unified header for all SaaS apps (landing + dashboard).
 */
const landingHeaderVariants = cva(
  'sticky top-0 z-40 w-full border-b backdrop-blur transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'bg-background/80',
        transparent: 'bg-transparent border-transparent',
        solid: 'bg-background',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

interface LandingHeaderProps
  extends React.ComponentProps<'header'>,
    VariantProps<typeof landingHeaderVariants> {}

/**
 * @deprecated Use `AppHeader` from `./app-layout` instead.
 */
function LandingHeader({ className, variant, children, ...props }: LandingHeaderProps) {
  return (
    <header
      data-slot="landing-header"
      className={cn(landingHeaderVariants({ variant }), className)}
      {...props}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
        {children}
      </div>
    </header>
  )
}

// --- LandingLogo ---

/**
 * @deprecated Use `AppLogo` from `./app-layout` instead.
 */
function LandingLogo({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="landing-logo"
      className={cn('flex shrink-0 items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// --- LandingNav — desktop nav links (hidden on mobile) ---

/**
 * @deprecated Use `AppNav` from `./app-layout` instead.
 */
function LandingNav({ className, children, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="landing-nav"
      role="navigation"
      aria-label="Primary navigation"
      className={cn('hidden items-center gap-1 md:flex', className)}
      {...props}
    >
      {children}
    </nav>
  )
}

// --- LandingNavLink ---

const landingNavLinkVariants = cva(
  'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
  {
    variants: {
      active: {
        true: 'text-foreground',
        false: 'text-muted-foreground hover:text-foreground hover:bg-accent',
      },
    },
    defaultVariants: { active: false },
  }
)

interface LandingNavLinkProps
  extends React.ComponentProps<'a'>,
    VariantProps<typeof landingNavLinkVariants> {}

/**
 * @deprecated Use `AppNavLink` from `./app-layout` instead.
 */
function LandingNavLink({ className, active, children, ...props }: LandingNavLinkProps) {
  return (
    <a
      data-slot="landing-nav-link"
      className={cn(landingNavLinkVariants({ active }), className)}
      {...props}
    >
      {children}
    </a>
  )
}

// --- LandingActions — right side of header (CTA buttons, etc.) ---

/**
 * @deprecated Use `AppActions` from `./app-layout` instead.
 */
function LandingActions({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="landing-actions"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// --- LandingMenuToggle — hamburger for mobile ---

/**
 * @deprecated Use `AppMobileToggle` from `./app-layout` instead.
 */
function LandingMenuToggle({ className, ...props }: React.ComponentProps<'button'>) {
  const { menuOpen, setMenuOpen } = useLanding()

  return (
    <button
      type="button"
      data-slot="landing-menu-toggle"
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2 md:hidden',
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      onClick={() => setMenuOpen(!menuOpen)}
      aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={menuOpen}
      {...props}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        {menuOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  )
}

// --- LandingMobileMenu — mobile dropdown menu ---

/**
 * @deprecated Use `AppMobileMenu` from `./app-layout` instead.
 */
function LandingMobileMenu({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { menuOpen, setMenuOpen } = useLanding()

  if (!menuOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 md:hidden"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <div
        data-slot="landing-mobile-menu"
        className={cn(
          'fixed inset-x-0 top-16 z-40 border-b bg-background p-4 shadow-lg md:hidden',
          'animate-in slide-in-from-top-2 fade-in duration-200',
          className
        )}
        role="navigation"
        aria-label="Mobile navigation"
        {...props}
      >
        <nav className="flex flex-col gap-1">
          {children}
        </nav>
      </div>
    </>
  )
}

// --- LandingMobileLink ---

interface LandingMobileLinkProps extends React.ComponentProps<'a'> {
  active?: boolean
}

/**
 * @deprecated Use `AppMobileLink` from `./app-layout` instead.
 */
function LandingMobileLink({ className, active, children, ...props }: LandingMobileLinkProps) {
  const { setMenuOpen } = useLanding()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      setMenuOpen(false)
      props.onClick?.(e)
    },
    [setMenuOpen, props.onClick]
  )

  return (
    <a
      data-slot="landing-mobile-link"
      className={cn(
        'flex items-center rounded-md px-3 py-3 text-base font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className
      )}
      aria-current={active ? 'page' : undefined}
      {...props}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}

// --- LandingHero ---

function LandingHeroSection({ className, children, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      data-slot="landing-hero"
      className={cn(
        'relative flex flex-col items-center justify-center px-4 py-16 text-center',
        'md:py-24 lg:py-32',
        className
      )}
      {...props}
    >
      <div className="container mx-auto max-w-4xl">{children}</div>
    </section>
  )
}

// --- LandingSection — generic content section ---

const landingSectionVariants = cva('relative px-4 py-12 md:py-16 lg:py-24', {
  variants: {
    variant: {
      default: '',
      muted: 'bg-muted',
      accent: 'bg-accent',
    },
    align: {
      center: 'text-center',
      left: 'text-left',
      right: 'text-right',
    },
  },
  defaultVariants: { variant: 'default', align: 'left' },
})

interface LandingSectionProps
  extends React.ComponentProps<'section'>,
    VariantProps<typeof landingSectionVariants> {}

function LandingSection({ className, variant, align, children, ...props }: LandingSectionProps) {
  return (
    <section
      data-slot="landing-section"
      className={cn(landingSectionVariants({ variant, align }), className)}
      {...props}
    >
      <div className="container mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

// --- LandingFooter ---

/**
 * @deprecated Use `AppFooter` + `FooterColumn` + `FooterLink` + `FooterBrand` from `./app-layout` instead.
 */
function LandingFooter({ className, children, ...props }: React.ComponentProps<'footer'>) {
  return (
    <footer
      data-slot="landing-footer"
      className={cn(
        'mt-auto border-t bg-muted px-4 py-8 md:py-12',
        className
      )}
      {...props}
    >
      <div className="container mx-auto max-w-6xl">{children}</div>
    </footer>
  )
}

// --- Exports ---

export {
  LandingLayout,
  LandingHeader,
  LandingLogo,
  LandingNav,
  LandingNavLink,
  LandingActions,
  LandingMenuToggle,
  LandingMobileMenu,
  LandingMobileLink,
  LandingHeroSection,
  LandingSection,
  LandingFooter,
  useLanding,
}

export type {
  LandingHeaderProps,
  LandingNavLinkProps,
  LandingMobileLinkProps,
  LandingSectionProps,
}
