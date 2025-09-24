'use client'

import React from 'react'
import { useDevice } from '../../hooks'
import { cn } from '../../lib'
import { Button } from '../button'
import { Header } from '../header'
import { Icon, type KnownIconName } from '../icon'
import { Div, Main } from '../tag'
import { Footer, type FooterLink, type SocialLink } from './footer'

export interface NavigationItem {
  href: string
  label: string
  icon?: KnownIconName
}

import { type BottomNavItem } from './mobile-navbar'

export interface ClientLayoutProps {
  children: React.ReactNode

  // App info
  appName: string
  currentPath?: string

  // Header props
  logoIcon?: KnownIconName
  logoHref?: string
  headerNavigation?: NavigationItem[]
  ctaText?: string
  ctaVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  ctaSize?: 'default' | 'sm' | 'lg' | 'icon'
  onCtaClick?: () => void
  headerRightContent?: React.ReactNode

  // Mobile bottom navigation
  bottomNavigation?: BottomNavItem[]

  // Footer props
  socialLinks?: SocialLink[]
  footerLinks?: FooterLink[]
  showCopyright?: boolean

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
  logoIcon,
  logoHref,
  headerNavigation = [],
  ctaText,
  ctaVariant,
  ctaSize,
  onCtaClick,
  headerRightContent,

  // Mobile nav
  bottomNavigation = [],

  // Footer
  socialLinks = [],
  footerLinks = [],
  showCopyright = true,

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
        position="fixed"
        leftContent={
          <div className="flex items-center space-x-4">
            {logoIcon && (
              <LinkComponent href={logoHref || '/'} className="flex items-center space-x-2">
                <Icon name={logoIcon} className="h-8 w-8" />
                <span className="text-xl font-bold">{appName}</span>
              </LinkComponent>
            )}
          </div>
        }
        centerContent={
          <nav className="hidden lg:flex space-x-6">
            {headerNavigation?.map(item => (
              <LinkComponent
                key={item.href}
                href={item.href}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {item.label}
              </LinkComponent>
            ))}
          </nav>
        }
        rightContent={
          <div className="flex items-center space-x-2">
            {ctaText && (
              <Button
                variant={ctaVariant}
                size={ctaSize}
                onClick={onCtaClick}
                className="hidden lg:inline-flex"
              >
                {ctaText}
              </Button>
            )}
            {headerRightContent}
          </div>
        }
        className={headerClassName}
      />

      {/* Main content */}
      <Main className={cn('')}>{children}</Main>

      {/* Footer */}
      <Footer
        appName={appName}
        socialLinks={socialLinks}
        footerLinks={footerLinks}
        showCopyright={showCopyright}
        LinkComponent={LinkComponent}
        className={footerClassName}
      />

      {/* Mobile bottom navigation */}
      {/* {isMobile && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <MobileNavbar
            navigationItems={bottomNavigation}
            headerNavigation={headerNavigation}
            currentPath={currentPath}
            LinkComponent={LinkComponent}
            logoIcon={logoIcon}
            logoHref={logoHref}
            appName={appName}
            className={mobileNavbarClassName}
          />
        </div>
      )} */}
    </Div>
  )
}

// Re-export types for convenience
export type { BottomNavItem, FooterLink, SocialLink }
