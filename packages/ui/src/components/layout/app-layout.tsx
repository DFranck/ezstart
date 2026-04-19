'use client'

import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useState, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Context — mobile menu open state shared across compound

interface AppLayoutContextValue {
  /** Whether the mobile menu is open */
  menuOpen: boolean
  /** Toggle the mobile menu */
  setMenuOpen: (open: boolean) => void
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null)

function useAppLayout() {
  const ctx = useContext(AppLayoutContext)
  if (!ctx) {
    throw new Error('App layout compound components must be used within <AppLayout>')
  }
  return ctx
}

// AppLayout — root shell, provides mobile menu context

const AppLayout = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, children, ...props }, ref) => {
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
      <AppLayoutContext.Provider value={{ menuOpen, setMenuOpen }}>
        <div
          ref={ref}
          data-slot="app-layout"
          className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}
          {...props}
        >
          {children}
        </div>
      </AppLayoutContext.Provider>
    )
  }
)
AppLayout.displayName = 'AppLayout'

// AppHeader — sticky header, responsive

const appHeaderVariants = cva(
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

interface AppHeaderProps
  extends React.ComponentProps<'header'>,
    VariantProps<typeof appHeaderVariants> {}

const AppHeader = forwardRef<HTMLElement, AppHeaderProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <header
        ref={ref}
        data-slot="app-header"
        className={cn(appHeaderVariants({ variant }), className)}
        {...props}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          {children}
        </div>
      </header>
    )
  }
)
AppHeader.displayName = 'AppHeader'

// AppLogo — image + text, links to home

const AppLogo = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="app-logo"
        className={cn('flex shrink-0 items-center gap-2', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AppLogo.displayName = 'AppLogo'

// AppNav — desktop nav links (hidden on mobile)

const AppNav = forwardRef<HTMLElement, React.ComponentProps<'nav'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        data-slot="app-nav"
        role="navigation"
        aria-label="Primary navigation"
        className={cn('hidden items-center gap-1 md:flex', className)}
        {...props}
      >
        {children}
      </nav>
    )
  }
)
AppNav.displayName = 'AppNav'

// AppNavLink — individual nav link with active prop

const appNavLinkVariants = cva(
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

interface AppNavLinkProps
  extends React.ComponentProps<'a'>,
    VariantProps<typeof appNavLinkVariants> {}

const AppNavLink = forwardRef<HTMLAnchorElement, AppNavLinkProps>(
  ({ className, active, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        data-slot="app-nav-link"
        aria-current={active ? 'page' : undefined}
        className={cn(appNavLinkVariants({ active }), className)}
        {...props}
      >
        {children}
      </a>
    )
  }
)
AppNavLink.displayName = 'AppNavLink'

// AppActions — right side slot (switchers, auth buttons, etc.)

const AppActions = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="app-actions"
        className={cn('flex items-center gap-2', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AppActions.displayName = 'AppActions'

// AppMobileToggle — hamburger button, md:hidden

const AppMobileToggle = forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
  ({ className, ...props }, ref) => {
    const { menuOpen, setMenuOpen } = useAppLayout()

    return (
      <button
        ref={ref}
        type="button"
        data-slot="app-mobile-toggle"
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
)
AppMobileToggle.displayName = 'AppMobileToggle'

// AppMobileMenu — full-width dropdown with backdrop

const AppMobileMenu = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, children, ...props }, ref) => {
    const { menuOpen, setMenuOpen } = useAppLayout()

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
          ref={ref}
          data-slot="app-mobile-menu"
          className={cn(
            'fixed inset-x-0 top-16 z-40 border-b bg-background p-4 shadow-lg md:hidden',
            'animate-in slide-in-from-top-2 fade-in duration-200',
            className
          )}
          role="navigation"
          aria-label="Mobile navigation"
          {...props}
        >
          <nav className="flex flex-col gap-1">{children}</nav>
        </div>
      </>
    )
  }
)
AppMobileMenu.displayName = 'AppMobileMenu'

// AppMobileLink — mobile nav link with auto-close

interface AppMobileLinkProps extends React.ComponentProps<'a'> {
  active?: boolean
}

const AppMobileLink = forwardRef<HTMLAnchorElement, AppMobileLinkProps>(
  ({ className, active, children, onClick, ...props }, ref) => {
    const { setMenuOpen } = useAppLayout()

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        setMenuOpen(false)
        onClick?.(e)
      },
      [setMenuOpen, onClick]
    )

    return (
      <a
        ref={ref}
        data-slot="app-mobile-link"
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
)
AppMobileLink.displayName = 'AppMobileLink'

// AppMain — main content area with proper padding/max-width

const AppMain = forwardRef<HTMLElement, React.ComponentProps<'main'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <main
        ref={ref}
        data-slot="app-main"
        className={cn('flex-1', className)}
        {...props}
      >
        {children}
      </main>
    )
  }
)
AppMain.displayName = 'AppMain'

// AppContent — inner content wrapper (optional, for max-width constrained content)

const AppContent = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="app-content"
        className={cn('container mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AppContent.displayName = 'AppContent'

// Re-export footer compound (split for file-size compliance)

export { AppFooter, FooterColumn, FooterLink, FooterBrand } from './app-footer'
export type { FooterColumnProps, FooterBrandProps } from './app-footer'

// Exports

export {
  AppLayout,
  AppHeader,
  AppLogo,
  AppNav,
  AppNavLink,
  AppActions,
  AppMobileToggle,
  AppMobileMenu,
  AppMobileLink,
  AppMain,
  AppContent,
  useAppLayout,
}

export type {
  AppHeaderProps,
  AppNavLinkProps,
  AppMobileLinkProps,
}
