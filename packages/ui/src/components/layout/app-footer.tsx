'use client'

import * as React from 'react'
import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// AppFooter — footer with grid columns
// ---------------------------------------------------------------------------

const AppFooter = forwardRef<HTMLElement, React.ComponentProps<'footer'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <footer
        ref={ref}
        data-slot="app-footer"
        className={cn('mt-auto border-t bg-muted px-4 py-8 md:py-12', className)}
        {...props}
      >
        <div className="container mx-auto max-w-6xl">{children}</div>
      </footer>
    )
  }
)
AppFooter.displayName = 'AppFooter'

// ---------------------------------------------------------------------------
// FooterColumn — column with title + links
// ---------------------------------------------------------------------------

interface FooterColumnProps extends React.ComponentProps<'div'> {
  /** Column heading */
  title: string
}

const FooterColumn = forwardRef<HTMLDivElement, FooterColumnProps>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="footer-column"
        className={cn('flex flex-col gap-3', className)}
        {...props}
      >
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <ul className="flex flex-col gap-2">{children}</ul>
      </div>
    )
  }
)
FooterColumn.displayName = 'FooterColumn'

// ---------------------------------------------------------------------------
// FooterLink — footer link
// ---------------------------------------------------------------------------

interface FooterLinkProps extends React.ComponentProps<'a'> {
  /**
   * When true, render the immediate child (e.g. a locale-aware `<Link>`) instead
   * of a native `<a>`. The `<li>` wrapper is preserved either way so consumers
   * keep semantic list markup.
   *
   * @example
   * <FooterLink asChild>
   *   <Link href="/privacy">Privacy</Link>
   * </FooterLink>
   */
  asChild?: boolean
}

const FooterLink = forwardRef<HTMLAnchorElement, FooterLinkProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'a'
    return (
      <li>
        <Comp
          ref={ref}
          data-slot="footer-link"
          className={cn(
            'text-sm text-muted-foreground transition-colors hover:text-foreground',
            className
          )}
          {...props}
        >
          {children}
        </Comp>
      </li>
    )
  }
)
FooterLink.displayName = 'FooterLink'

// ---------------------------------------------------------------------------
// FooterBrand — logo + tagline + copyright at bottom
// ---------------------------------------------------------------------------

interface FooterBrandProps extends React.ComponentProps<'div'> {
  /** Tagline text below the logo */
  tagline?: string
  /** Copyright text */
  copyright?: string
}

const FooterBrand = forwardRef<HTMLDivElement, FooterBrandProps>(
  ({ className, tagline, copyright, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="footer-brand"
        className={cn('flex flex-col gap-2', className)}
        {...props}
      >
        {/* Logo slot (children) */}
        {children}
        {tagline && <p className="text-sm text-muted-foreground">{tagline}</p>}
        {copyright && <p className="text-xs text-muted-foreground">{copyright}</p>}
      </div>
    )
  }
)
FooterBrand.displayName = 'FooterBrand'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { AppFooter, FooterColumn, FooterLink, FooterBrand }

export type { FooterColumnProps, FooterLinkProps, FooterBrandProps }
