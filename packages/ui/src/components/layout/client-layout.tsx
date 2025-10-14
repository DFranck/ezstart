'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MobileNavbar } from '.'
import { useClickOutside, useDevice, useOnScroll } from '../../hooks'
import { cn } from '../../lib'
import { Burger } from '../burger'
import { Button } from '../button'
import { Header } from '../header'
import { Icon } from '../icon'
import { Div, Main } from '../tag'
import { headerVariantConfig } from '../tag/src/variants/tags/header'
import { Footer } from './footer'
import { NavigationItem, NavigationLink, isNavigationMenu } from './types'

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

  // Smart navigation (auto-adapts to device)
  navLinks?: NavigationLink[] // Auto-renders in headerCenter (desktop), burger (tablet), bottom nav (mobile)

  // Legacy navigation props (deprecated, use navLinks instead)
  bottomNavigation?: NavigationItem[]
  burgerNavigation?: NavigationItem[] // Navigation items for burger menu (tablet)
  hideBottomNavOnMobile?: boolean // Hide bottom navigation on mobile (useful for pages with fixed bottom elements like Stepper)

  // Footer props (standard content + flexible zones)
  showFooter?: boolean // Show/hide footer (default: true)
  footerAppName?: string // Uses appName if not provided
  creator?: React.ReactNode // String or JSX with links
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

  // Smart navigation
  navLinks,

  // Legacy nav (deprecated)
  bottomNavigation = [],
  burgerNavigation,

  // Navigation control
  hideBottomNavOnMobile = false,

  // Footer
  showFooter = true,
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
  const { isMobile, isTablet, isDesktop } = useDevice()
  const scrollY = useOnScroll()
  const isTop = scrollY === 0
  const [isBurgerOpen, setIsBurgerOpen] = useState(false)
  const burgerMenuRef = useRef<HTMLDivElement>(null)

  const LinkTag = LinkComponent as any

  // Flatten navLinks for mobile/tablet (no nested menus)
  const flattenedNavLinks =
    navLinks?.flatMap(link => {
      if (isNavigationMenu(link)) {
        return link.menu
      }
      return [link]
    }) || []

  // Use smart navLinks if provided, otherwise legacy props
  const navigationItems = navLinks ? flattenedNavLinks : burgerNavigation || bottomNavigation
  const mobileNavItems = navLinks ? flattenedNavLinks : bottomNavigation

  // Close burger menu on click outside (tablet only)
  useClickOutside(burgerMenuRef, () => {
    if (isTablet && isBurgerOpen) {
      setIsBurgerOpen(false)
    }
  })

  // Close burger menu when switching from tablet to desktop
  useEffect(() => {
    if (!isTablet && isBurgerOpen) {
      setIsBurgerOpen(false)
    }
  }, [isTablet, isBurgerOpen])

  // Render desktop navigation (supports menus)
  const renderDesktopNav = () => {
    if (!navLinks || !isDesktop) return null

    return (
      <div className="hidden md:flex gap-2">
        {navLinks.map((link, index) => {
          if (isNavigationMenu(link)) {
            // TODO: Implement dropdown menu for desktop
            return (
              <div key={index} className="relative group">
                <Button variant="ghost" size="sm">
                  {link.icon && <Icon name={link.icon} className="w-4 h-4 mr-2" />}
                  {link.menuLabel}
                  <Icon name="lucide:ChevronDown" className="w-3 h-3 ml-1" />
                </Button>
                <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-background border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {link.menu.map(item => (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className="w-full justify-start rounded-none"
                    >
                      <LinkTag href={item.href}>
                        {item.icon && <Icon name={item.icon} className="w-4 h-4 mr-2" />}
                        {item.label}
                      </LinkTag>
                    </Button>
                  ))}
                </div>
              </div>
            )
          }

          return (
            <Button key={link.href} asChild variant="ghost" size="sm">
              <LinkTag href={link.href}>
                {link.icon && <Icon name={link.icon} className="w-4 h-4 mr-2" />}
                {link.label}
              </LinkTag>
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <Div className={cn('min-h-screen flex flex-col', className)}>
      {/* Header with smart navigation */}
      <Header
        position={headerPosition}
        leftContent={headerLeftContent}
        centerContent={navLinks ? renderDesktopNav() : headerCenterContent}
        rightContent={
          <div className="flex items-center gap-2">
            {headerRightContent}
            {isTablet && navigationItems.length > 0 && (
              <Burger isOpen={isBurgerOpen} setIsOpen={setIsBurgerOpen} />
            )}
          </div>
        }
        className={headerClassName}
      />

      {/* Burger dropdown menu (tablet only) - outside Header for full width */}
      {isTablet && navigationItems.length > 0 && (
        <div
          ref={burgerMenuRef}
          style={{ top: `${isTop ? 70 : 54}px` }}
          className={cn(
            'fixed inset-x-0 z-30',
            'transition-all duration-500 ease-in-out overflow-hidden',
            isBurgerOpen ? 'max-h-[400px] py-4 bg-background border-b-2' : 'max-h-0'
          )}
        >
          <nav className="flex flex-col gap-2 px-6 w-full">
            {navigationItems.map(item => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className="justify-start"
                onClick={() => setIsBurgerOpen(false)}
              >
                <LinkTag href={item.href}>
                  {item.icon && <Icon name={item.icon} className="w-4 h-4 mr-2" />}
                  {item.label}
                </LinkTag>
              </Button>
            ))}
          </nav>
        </div>
      )}

      {/* Main content */}
      <Main className={cn()}>{children}</Main>

      {/* Footer */}
      {showFooter && (
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
      )}

      {/* Mobile bottom navigation */}
      {isMobile && !hideBottomNavOnMobile && mobileNavItems.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <MobileNavbar
            headerNavigation={mobileNavItems}
            currentPath={currentPath}
            LinkComponent={LinkComponent}
            appName={appName}
            className={mobileNavbarClassName}
          />
        </div>
      )}
    </Div>
  )
}
