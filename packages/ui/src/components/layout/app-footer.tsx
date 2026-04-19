'use client'

import * as React from 'react'
import { forwardRef } from 'react'
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

const FooterLink = forwardRef<HTMLAnchorElement, React.ComponentProps<'a'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <li>
        <a
          ref={ref}
          data-slot="footer-link"
          className={cn(
            'text-sm text-muted-foreground transition-colors hover:text-foreground',
            className
          )}
          {...props}
        >
          {children}
        </a>
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
        {tagline && (
          <p className="text-sm text-muted-foreground">{tagline}</p>
        )}
        {copyright && (
          <p className="text-xs text-muted-foreground">{copyright}</p>
        )}
      </div>
    )
  }
)
FooterBrand.displayName = 'FooterBrand'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { AppFooter, FooterColumn, FooterLink, FooterBrand }

export type { FooterColumnProps, FooterBrandProps }
