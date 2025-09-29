'use client'

import React from 'react'
import { MobileNavbar } from '.'
import { useDevice } from '../../hooks'
import { cn } from '../../lib'
import { Header } from '../header'
import { Div, Main } from '../tag'
import { headerVariantConfig } from '../tag/src/variants/tags/header'
import { Footer } from './footer'
import { NavigationItem } from './types'

export interface ClientLayoutProps {
  children: React.ReactNode

  // App info
  appName: string
  currentPath?: string

  // Header props (matching Header component props)
  headerPosition?: keyof typeof headerVariantConfig.position
  headerLeftContent?: React.ReactNode
  headerCenterContent?: React.ReactNode
  headerRightContent?: React.ReactNode

  // Mobile bottom navigation
  bottomNavigation?: NavigationItem[]

  // Footer props (standard content + flexible zones)
  footerAppName?: string  // Uses appName if not provided
  creator?: React.ReactNode  // String or JSX with links
  footerShowCopyright?: boolean
  footerCopyrightYear?: number
  footerTopContent?: React.ReactNode
  footerLeftContent?: React.ReactNode
  footerCenterContent?: React.ReactNode
  footerRightContent?: React.ReactNode
  footerBottomContent?: React.ReactNode
  footerLayout?: 'simple' | 'columns' | 'stacked'
  footerStackOnMobile?: boolean

  // Link component (Next.js Link, React Router Link, etc.)
  LinkComponent?: React.ComponentType<any> | string

  // Styling
  className?: string
  headerClassName?: string
  footerClassName?: string
  mobileNavbarClassName?: string
}

export function ClientLayout({
  children,
  appName,
  currentPath = '/',

  // Header
  headerPosition = 'fixed',
  headerLeftContent,
  headerCenterContent,
  headerRightContent,

  // Mobile nav
  bottomNavigation = [],

  // Footer
  footerAppName,
  creator,
  footerShowCopyright = true,
  footerCopyrightYear,
  footerTopContent,
  footerLeftContent,
  footerCenterContent,
  footerRightContent,
  footerBottomContent,
  footerLayout = 'simple',
  footerStackOnMobile = true,

  // Components
  LinkComponent = 'a',

  // Styling
  className,
  headerClassName,
  footerClassName,
  mobileNavbarClassName,
}: ClientLayoutProps) {
  const { isMobile } = useDevice()

  return (
    <Div className={cn('min-h-screen flex flex-col', className)}>
      {/* Header */}
      <Header
        position={headerPosition}
        leftContent={headerLeftContent}
        centerContent={headerCenterContent}
        rightContent={headerRightContent}
        className={headerClassName}
      />

      {/* Main content */}
      <Main className={cn('')}>{children}</Main>

      {/* Footer */}
      <Footer
        appName={footerAppName || appName}
        creator={creator}
        showCopyright={footerShowCopyright}
        copyrightYear={footerCopyrightYear}
        topContent={footerTopContent}
        leftContent={footerLeftContent}
        centerContent={footerCenterContent}
        rightContent={footerRightContent}
        bottomContent={footerBottomContent}
        layout={footerLayout}
        stackOnMobile={footerStackOnMobile}
        className={footerClassName}
      />

      {/* Mobile bottom navigation */}
      {isMobile && bottomNavigation.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <MobileNavbar
            headerNavigation={bottomNavigation}
            // headerNavigation={bottomNavigation}
            currentPath={currentPath}
            LinkComponent={LinkComponent}
            // logoIcon={logoIcon}
            // logoHref={logoHref}
            appName={appName}
            className={mobileNavbarClassName}
          />
        </div>
      )}
    </Div>
  )
}
