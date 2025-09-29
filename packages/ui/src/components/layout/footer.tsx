'use client'

import type { ReactNode } from 'react'
import { Tag } from '../'
import { useDevice } from '../../hooks'
import { cn } from '../../lib'

interface FooterProps {
  // Standard content props (auto-generates classic footer elements)
  appName?: string
  creator?: ReactNode // Can be string "John Doe" or JSX with links
  showCopyright?: boolean
  copyrightYear?: number // Default: current year

  // Content zones - fully flexible (overrides standard content if provided)
  topContent?: ReactNode
  leftContent?: ReactNode
  centerContent?: ReactNode
  rightContent?: ReactNode
  bottomContent?: ReactNode

  // Layout options
  layout?: 'simple' | 'columns' | 'stacked' // Different responsive layouts

  // Styling
  className?: string
  containerClassName?: string

  // Responsive behavior
  mobileBreakpoint?: number // Default 768px
  stackOnMobile?: boolean // Stack content vertically on mobile
}

export function Footer({
  // Standard props
  appName,
  creator,
  showCopyright = true,
  copyrightYear,

  // Content zones
  topContent,
  leftContent,
  centerContent,
  rightContent,
  bottomContent,

  // Layout
  layout = 'simple',
  className,
  containerClassName,
  mobileBreakpoint = 768,
  stackOnMobile = true,
}: FooterProps) {
  const { width } = useDevice()
  const isMobile = width !== null && width < mobileBreakpoint

  // Generate standard content if no custom content provided
  const currentYear = copyrightYear || new Date().getFullYear()

  const standardLeftContent = !leftContent && (appName || showCopyright) && (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center text-sm text-muted-foreground">
      {showCopyright && appName && (
        <span>
          © {currentYear} {appName}. All rights reserved.
        </span>
      )}
      {showCopyright && !appName && <span>© {currentYear}. All rights reserved.</span>}
    </div>
  )

  const standardRightContent = !rightContent && creator && (
    <div className="text-sm text-muted-foreground">
      {typeof creator === 'string' ? `Created by ${creator}` : creator}
    </div>
  )

  // Use standard content if no custom content provided
  const finalLeftContent = leftContent || standardLeftContent
  const finalRightContent = rightContent || standardRightContent

  // Simple layout: left, center, right in one row
  if (layout === 'simple') {
    return (
      <Tag
        as="footer"
        data-component="footer"
        layout="centered"
        className={cn('border-t', className)}
      >
        <div className={cn('py-6 px-4', containerClassName)}>
          {/* Top section if provided */}
          {topContent && <div className="mb-6">{topContent}</div>}

          {/* Main content row */}
          <div
            className={cn(
              'flex gap-6',
              stackOnMobile && isMobile
                ? 'flex-col items-center text-center'
                : 'flex-row items-center justify-between'
            )}
          >
            {finalLeftContent && <div className="flex-shrink-0">{finalLeftContent}</div>}

            {centerContent && (
              <div
                className={cn(
                  !finalLeftContent && !finalRightContent && 'mx-auto',
                  'flex-1 text-center'
                )}
              >
                {centerContent}
              </div>
            )}

            {finalRightContent && <div className="flex-shrink-0">{finalRightContent}</div>}
          </div>

          {/* Bottom section if provided */}
          {bottomContent && <div className="mt-6 pt-6 border-t">{bottomContent}</div>}
        </div>
      </Tag>
    )
  }

  // Columns layout: Multiple columns with responsive grid
  if (layout === 'columns') {
    return (
      <Tag
        as="footer"
        data-component="footer"
        layout="centered"
        className={cn('border-t', className)}
      >
        <div className={cn('py-8 px-4', containerClassName)}>
          {/* Top section */}
          {topContent && <div className="mb-8">{topContent}</div>}

          {/* Columns grid */}
          <div
            className={cn(
              'grid gap-8',
              isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            )}
          >
            {finalLeftContent}
            {centerContent}
            {finalRightContent}
          </div>

          {/* Bottom section */}
          {bottomContent && <div className="mt-8 pt-8 border-t text-center">{bottomContent}</div>}
        </div>
      </Tag>
    )
  }

  // Stacked layout: Everything stacked vertically
  return (
    <Tag
      as="footer"
      data-component="footer"
      layout="centered"
      className={cn('border-t', className)}
    >
      <div className={cn('py-6 px-4 space-y-6', containerClassName)}>
        {topContent}
        {finalLeftContent}
        {centerContent}
        {finalRightContent}
        {bottomContent}
      </div>
    </Tag>
  )
}
