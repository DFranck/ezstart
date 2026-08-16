'use client'

import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useState, forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { useOnScroll } from '../../hooks/use-on-scroll'

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

// AppHeader — sticky (default) or overlay header, responsive
//
// - `mode='sticky'` (default) — header stays in flow, takes h-16, `sticky top-0`,
//   `bg-background/80 backdrop-blur`. Content below starts AFTER the header.
// - `mode='overlay'` — header is `absolute inset-x-0 top-0 z-40`, OUT of the
//   flex flow. The first page section renders full-viewport UNDER the header
//   (use with `LandingHero variant="full"` + `backgroundSlot` for immersive
//   hero — Linear / Vercel / Framer pattern). The header automatically gets
//   `variant='transparent'` if no variant is passed.

const appHeaderVariants = cva('w-full transition-colors duration-200', {
  variants: {
    variant: {
      default: 'border-b backdrop-blur bg-background/80',
      transparent: 'bg-transparent border-transparent',
      solid: 'border-b bg-background',
    },
    mode: {
      // Stays in document flow, sticks to viewport top on scroll. Pushes
      // content down by its own height (h-16). Default for most pages.
      sticky: 'sticky top-0 z-40',
      // Pulled OUT of the flex flow (so the next section can render full
      // 100vh under the header) but still pinned to the viewport top via
      // `fixed` so the header stays visible during scroll. Pair with a
      // hero that has its own 100vh height — when the user scrolls past
      // the hero, the header overlays the next section (use a `solid` /
      // `default` variant + a scroll listener if you want it to switch
      // background on scroll, out of scope for the base component).
      overlay: 'fixed inset-x-0 top-0 z-40',
    },
  },
  defaultVariants: { variant: 'default', mode: 'sticky' },
})

interface AppHeaderProps
  extends Omit<React.ComponentProps<'header'>, 'mode'>, VariantProps<typeof appHeaderVariants> {}

const AppHeader = forwardRef<HTMLElement, AppHeaderProps>(
  ({ className, variant, mode, children, ...props }, ref) => {
    // Scroll-aware behavior for overlay mode (Vercel / Linear / Stripe pattern):
    // at scrollY=0 → fully transparent + larger padding (py-4, h-20 inner row);
    // on scroll → semi-transparent bg + backdrop-blur + smaller padding (py-2,
    // h-16 inner row) for legibility over content. Smooth transition.
    const scrollY = useOnScroll()
    const isAtTop = scrollY === 0
    const isOverlay = mode === 'overlay'

    // Resolve variant : overlay defaults to transparent at top, then auto-flips
    // to a translucent solid on scroll so the header stays readable above any
    // section that scrolls under it (image, video, dense content).
    const resolvedVariant = variant ?? (isOverlay && isAtTop ? 'transparent' : 'default')

    return (
      <header
        ref={ref}
        data-slot="app-header"
        data-mode={mode ?? 'sticky'}
        data-at-top={isAtTop}
        className={cn(
          appHeaderVariants({ variant: resolvedVariant, mode }),
          // Animate the bg + padding swap when in overlay mode.
          isOverlay && 'transition-all duration-200 ease-out',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'container mx-auto flex items-center justify-between px-4 md:px-6 lg:px-8 transition-all duration-200 ease-out',
            // At top of overlay → larger row, no border. Scrolled → compact.
            isOverlay && isAtTop ? 'h-20' : 'h-16'
          )}
        >
          {children}
        </div>
      </header>
    )
  }
)
AppHeader.displayName = 'AppHeader'

// AppLogo — image + text, links to home

interface AppLogoProps extends React.ComponentProps<'div'> {
  /**
   * When true, render the immediate child (e.g. a `<Link>`) instead of a `<div>`.
   * The child receives the merged className and a11y props via Radix `<Slot>`.
   *
   * @example
   * <AppLogo asChild>
   *   <Link href="/">Brand</Link>
   * </AppLogo>
   */
  asChild?: boolean
}

const AppLogo = forwardRef<HTMLDivElement, AppLogoProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div'
    return (
      <Comp
        ref={ref}
        data-slot="app-logo"
        className={cn('flex shrink-0 items-center gap-2', className)}
        {...props}
      >
        {children}
      </Comp>
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
        // Active = full foreground + slightly bolder weight to clearly mark
        // the current section (sidebar / breadcrumb pattern).
        true: 'text-foreground font-semibold',
        // Inactive = `text-foreground/70` so links stay legible over
        // transparent / image / aurora backgrounds (the previous
        // `text-muted-foreground` washed out on bright hero overlays).
        // Hover bumps to full foreground.
        false: 'text-foreground/70 hover:text-foreground hover:bg-accent',
      },
    },
    defaultVariants: { active: false },
  }
)

interface AppNavLinkProps
  extends React.ComponentProps<'a'>, VariantProps<typeof appNavLinkVariants> {
  /**
   * When true, render the immediate child (e.g. a locale-aware `<Link>`) instead
   * of a native `<a>`. Required to get SPA navigation in Next.js apps — passing
   * `href` directly produces a full reload AND skips the locale prefix added by
   * `next-intl`'s `<Link>` (causing a 307 redirect).
   *
   * @example
   * <AppNavLink asChild active={pathname === '/dashboard'}>
   *   <Link href="/dashboard">Dashboard</Link>
   * </AppNavLink>
   */
  asChild?: boolean
}

const AppNavLink = forwardRef<HTMLAnchorElement, AppNavLinkProps>(
  ({ className, active, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'a'
    return (
      <Comp
        ref={ref}
        data-slot="app-nav-link"
        aria-current={active ? 'page' : undefined}
        className={cn(appNavLinkVariants({ active }), className)}
        {...props}
      >
        {children}
      </Comp>
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
  /**
   * When true, render the immediate child (e.g. a locale-aware `<Link>`) instead
   * of a native `<a>`. Radix `<Slot>` composes the auto-close handler with the
   * child's own `onClick`, so the menu still closes when the child handles
   * navigation.
   *
   * @example
   * <AppMobileLink asChild active={pathname === '/dashboard'}>
   *   <Link href="/dashboard">Dashboard</Link>
   * </AppMobileLink>
   */
  asChild?: boolean
}

const AppMobileLink = forwardRef<HTMLAnchorElement, AppMobileLinkProps>(
  ({ className, active, asChild = false, children, onClick, ...props }, ref) => {
    const { setMenuOpen } = useAppLayout()

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        setMenuOpen(false)
        onClick?.(e)
      },
      [setMenuOpen, onClick]
    )

    const Comp = asChild ? Slot : 'a'

    return (
      <Comp
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
      </Comp>
    )
  }
)
AppMobileLink.displayName = 'AppMobileLink'

// AppMain — main content area with proper padding/max-width

const AppMain = forwardRef<HTMLElement, React.ComponentProps<'main'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <main ref={ref} data-slot="app-main" className={cn('flex-1', className)} {...props}>
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
export type { FooterColumnProps, FooterLinkProps, FooterBrandProps } from './app-footer'

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

export type { AppHeaderProps, AppLogoProps, AppNavLinkProps, AppMobileLinkProps }
