'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MobileNavbar } from '.'
import { useDevice, useOnScroll } from '../../hooks'
import { cn } from '../../lib'
import { Burger } from '../burger'
import { Button } from '../button'
import { Icon, KnownIconName } from '../icon'
import { SkipLink } from '../skip-link'
import { Div, Main } from '../tag'
import { headerVariantConfig } from '../tag/src/variants/tags/header'
import { Footer } from './footer'
import { Header } from './header'
import { NavigationItem, NavigationLink, isNavigationMenu } from './types'

export interface ClientLayoutProps {
  children: React.ReactNode

  // App info
  appName: string
  currentPath?: string

  // Header props (matching Header component props)
  showHeader?: boolean
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

  // Mobile navbar logo (Icon OR Image)
  mobileLogoIcon?: string // Icon name (e.g., 'custom:Ezbill', 'lucide:Zap')
  mobileLogoSrc?: string // Image path (e.g., '/logo.png') - takes priority over logoIcon
  mobileLogoAlt?: string // Alt text for image logo
  mobileLogoHref?: string // Logo link href (default: '/')

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
  showHeader = true,
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

  // Mobile navbar logo
  mobileLogoIcon,
  mobileLogoSrc,
  mobileLogoAlt,
  mobileLogoHref,

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
  const [openMenus, setOpenMenus] = useState<Set<number>>(new Set())
  const burgerMenuRef = useRef<HTMLDivElement>(null)
  const desktopMenuRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const LinkTag = LinkComponent as React.ElementType

  const toggleMenu = (index: number) => {
    setOpenMenus(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Keep navLinks with menus for mobile/tablet (now supports nested menus)
  // Use smart navLinks if provided, otherwise legacy props
  const navigationItems = navLinks || burgerNavigation || bottomNavigation
  const mobileNavItems = navLinks || bottomNavigation

  // Close burger menu on click outside (tablet only)
  // Note: Disabled because burger toggle handles open/close itself
  // useClickOutside(burgerMenuRef, () => {
  //   if (isTablet && isBurgerOpen) {
  //     setIsBurgerOpen(false)
  //   }
  // })

  // Close burger menu when switching from tablet to desktop
  useEffect(() => {
    if (!isTablet && isBurgerOpen) {
      setIsBurgerOpen(false)
    }
  }, [isTablet, isBurgerOpen])

  // Reset submenu state when burger menu closes
  useEffect(() => {
    if (!isBurgerOpen) {
      setOpenMenus(new Set())
    }
  }, [isBurgerOpen])

  // Close desktop menus when clicking outside
  useEffect(() => {
    if (!isDesktop || openMenus.size === 0) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      let shouldCloseAny = false
      const menusToClose: number[] = []

      openMenus.forEach(menuIndex => {
        const menuRef = desktopMenuRefs.current.get(menuIndex)
        if (menuRef && !menuRef.contains(event.target as Node)) {
          menusToClose.push(menuIndex)
          shouldCloseAny = true
        }
      })

      if (shouldCloseAny) {
        setOpenMenus(prev => {
          const next = new Set(prev)
          menusToClose.forEach(index => next.delete(index))
          return next
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside as EventListener)
    document.addEventListener('touchstart', handleClickOutside as EventListener)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener)
      document.removeEventListener('touchstart', handleClickOutside as EventListener)
    }
  }, [isDesktop, openMenus])

  // Render desktop navigation (supports menus)
  const renderDesktopNav = () => {
    if (!navLinks || !isDesktop) return null

    return (
      <nav role="navigation" aria-label="Primary navigation" className="hidden md:flex gap-2">
        {navLinks.map((link, index) => {
          if (isNavigationMenu(link)) {
            const isMenuOpen = openMenus.has(index)
            const menuId = `desktop-menu-${index}`
            const buttonId = `desktop-menu-button-${index}`

            return (
              <div
                key={index}
                className="relative"
                ref={el => {
                  if (el) {
                    desktopMenuRefs.current.set(index, el)
                  } else {
                    desktopMenuRefs.current.delete(index)
                  }
                }}
              >
                <Button
                  id={buttonId}
                  variant="ghost"
                  size="sm"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                  aria-controls={menuId}
                  onClick={() => toggleMenu(index)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleMenu(index)
                    } else if (e.key === 'Escape' && isMenuOpen) {
                      toggleMenu(index)
                    }
                  }}
                >
                  {link.icon && <Icon name={link.icon} className="w-4 h-4 mr-2" ariaHidden />}
                  {link.menuLabel}
                  <Icon
                    name="lucide:ChevronDown"
                    className={cn('w-3 h-3 ml-1 transition-transform', isMenuOpen && 'rotate-180')}
                    ariaHidden
                  />
                </Button>
                <div
                  id={menuId}
                  role="menu"
                  aria-labelledby={buttonId}
                  className={cn(
                    'absolute top-full left-0 mt-1 min-w-[200px] bg-background border rounded-md shadow-lg transition-all duration-200',
                    isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                  )}
                >
                  {link.menu.map(item => (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className="w-full justify-start rounded-none"
                      role="menuitem"
                      onClick={() => toggleMenu(index)}
                    >
                      <LinkTag href={item.href}>
                        {item.icon && <Icon name={item.icon} className="w-4 h-4 mr-2" ariaHidden />}
                        {item.label}
                      </LinkTag>
                    </Button>
                  ))}
                </div>
              </div>
            )
          }

          const isActive = currentPath === link.href

          return (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              size="sm"
              aria-current={isActive ? 'page' : undefined}
            >
              <LinkTag href={link.href}>
                {link.icon && <Icon name={link.icon} className="w-4 h-4 mr-2" ariaHidden />}
                {link.label}
              </LinkTag>
            </Button>
          )
        })}
      </nav>
    )
  }

  return (
    <Div className={cn('min-h-screen flex flex-col', className)}>
      {/* Skip to main content link (WCAG 2.1 AA) */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>

      {/* Header with smart navigation */}
      {showHeader && (
        <Header
          position={headerPosition}
          leftContent={headerLeftContent}
          centerContent={navLinks ? renderDesktopNav() : headerCenterContent}
          rightContent={
            <div className="flex items-center gap-2">
              {headerRightContent}
              {isTablet && navigationItems.length > 0 && (
                <Burger
                  isOpen={isBurgerOpen}
                  setIsOpen={setIsBurgerOpen}
                  aria-expanded={isBurgerOpen}
                  aria-controls="tablet-burger-menu"
                  aria-label={isBurgerOpen ? 'Close navigation menu' : 'Open navigation menu'}
                />
              )}
            </div>
          }
          className={cn(headerClassName, { 'bg-background': isBurgerOpen })}
        />
      )}

      {/* Burger dropdown menu (tablet only) - outside Header for full width */}
      {isTablet && navigationItems.length > 0 && (
        <div
          id="tablet-burger-menu"
          ref={burgerMenuRef}
          role="navigation"
          aria-label="Tablet navigation menu"
          aria-hidden={!isBurgerOpen}
          style={{ top: `${isTop ? 70 : 54}px` }}
          className={cn(
            'fixed inset-x-0 z-30',
            'transition-all duration-500 ease-in-out overflow-hidden',
            isBurgerOpen ? 'max-h-[400px] py-4 bg-background border-b-2' : 'max-h-0'
          )}
        >
          <nav className="flex flex-col gap-2 px-6 w-full items-center">
            {navigationItems.map((item, index) => {
              // Handle menu items (with submenus - collapsible)
              if (isNavigationMenu(item)) {
                const isMenuOpen = openMenus.has(index)
                const submenuId = `tablet-submenu-${index}`
                const buttonId = `tablet-submenu-button-${index}`

                return (
                  <div key={index} className="w-full">
                    {/* Menu label - clickable to toggle */}
                    <button
                      id={buttonId}
                      aria-expanded={isMenuOpen}
                      aria-controls={submenuId}
                      onClick={() => toggleMenu(index)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleMenu(index)
                        } else if (e.key === 'Escape' && isMenuOpen) {
                          toggleMenu(index)
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-2 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent rounded-md transition-colors"
                    >
                      {item.icon && <Icon name={item.icon} className="w-4 h-4" ariaHidden />}
                      <span>{item.menuLabel}</span>
                      <Icon
                        name="lucide:ChevronDown"
                        className={cn('w-4 h-4 transition-transform', isMenuOpen && 'rotate-180')}
                        ariaHidden
                      />
                    </button>

                    {/* Submenu items - collapsible */}
                    <div
                      id={submenuId}
                      role="menu"
                      aria-labelledby={buttonId}
                      aria-hidden={!isMenuOpen}
                      className={cn(
                        'overflow-hidden transition-all duration-300 ease-in-out',
                        isMenuOpen ? 'max-h-96 mt-1' : 'max-h-0'
                      )}
                    >
                      <div className="space-y-1 pl-2">
                        {item.menu.map(subItem => {
                          const isActive = currentPath === subItem.href
                          return (
                            <Button
                              key={subItem.href}
                              asChild
                              variant="ghost"
                              className="w-full justify-center text-sm"
                              role="menuitem"
                              aria-current={isActive ? 'page' : undefined}
                              onClick={() => setIsBurgerOpen(false)}
                            >
                              <LinkTag href={subItem.href}>
                                {subItem.icon && (
                                  <Icon name={subItem.icon} className="w-4 h-4 mr-2" ariaHidden />
                                )}
                                {subItem.label}
                              </LinkTag>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              }

              // Handle regular links
              const isActive = currentPath === item.href
              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className="w-full justify-center"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsBurgerOpen(false)}
                >
                  <LinkTag href={item.href}>
                    {item.icon && <Icon name={item.icon} className="w-4 h-4 mr-2" ariaHidden />}
                    {item.label}
                  </LinkTag>
                </Button>
              )
            })}
          </nav>
        </div>
      )}

      {/* Main content */}
      <Main
        id="main-content"
        className={cn(
          showHeader && (headerPosition === 'fixed' || headerPosition === 'absolute') && 'pt-16'
        )}
      >
        {children}
      </Main>

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
          className={cn(
            footerClassName,
            // Add bottom padding when mobile nav is visible to prevent overlap
            isMobile && !hideBottomNavOnMobile && mobileNavItems.length > 0 && 'pb-20'
          )}
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
            logoIcon={mobileLogoIcon as KnownIconName}
            logoSrc={mobileLogoSrc}
            logoAlt={mobileLogoAlt}
            logoHref={mobileLogoHref}
            className={mobileNavbarClassName}
          />
        </div>
      )}
    </Div>
  )
}
