'use client'

import { Icon, Tag } from '../'
import { useDevice } from '../../hooks'
import { cn } from '../../lib'
import { useEffect, useState } from 'react'
import { MobileNavMenu } from './mobile-nav-menu'
import type { KnownIconName } from '../icon/src/types'
import { NavigationItem, NavigationLink } from './types'

export interface BottomNavItem {
  href: string
  icon: KnownIconName
  label: string
}

interface MobileNavbarProps {
  // Bottom nav items (optional - if empty, shows logo + burger)
  navigationItems?: BottomNavItem[]
  // Header navigation for burger menu (supports NavigationLink with menus)
  headerNavigation?: NavigationLink[]
  currentPath?: string
  LinkComponent?: React.ComponentType<any> | string
  className?: string
  // Logo props (Icon OR Image)
  logoIcon?: KnownIconName // Icon name (e.g., 'custom:Ezbill', 'lucide:Zap')
  logoSrc?: string // Image path (e.g., '/logo.png') - takes priority over logoIcon
  logoAlt?: string // Alt text for image logo
  logoHref?: string
  appName?: string
}

export function MobileNavbar({
  navigationItems = [],
  headerNavigation = [],
  currentPath = '/',
  LinkComponent = 'a',
  className,
  logoIcon = 'lucide:Zap' as KnownIconName,
  logoSrc,
  logoAlt,
  logoHref = '/',
  appName = 'App'
}: MobileNavbarProps) {
  const { isMobile } = useDevice()
  const [isOpen, setIsOpen] = useState(false)

  // Note: useClickOutside disabled - burger/X button handles all toggle logic

  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false)
    }
  }, [isMobile, isOpen])

  if (!isMobile) return null

  // If we have bottom nav items, show them + burger
  if (navigationItems.length > 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background">
        {/* Burger Menu */}
        {headerNavigation.length > 0 && (
          <div
            className={cn(
              'transition-all duration-500 border-t-2 ease-in-out overflow-hidden px-2',
              isOpen ? 'max-h-[400px] py-2' : 'max-h-0'
            )}
          >
            <MobileNavMenu
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              navigationItems={headerNavigation}
              LinkComponent={LinkComponent}
            />
          </div>
        )}

        {/* Bottom Navigation */}
        <Tag as="nav" className={cn('border-t', className)}>
          <div className="flex items-center justify-around py-2">
            {navigationItems.map((item) => {
              const isActive = currentPath === item.href
              return (
                <LinkComponent
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center p-2 text-xs transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-primary'
                  )}
                >
                  <Icon
                    name={item.icon}
                    className={cn(
                      'h-5 w-5 mb-1',
                      isActive && 'text-primary'
                    )}
                  />
                  <span>{item.label}</span>
                </LinkComponent>
              )
            })}

            {/* Burger button */}
            {headerNavigation.length > 0 && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex flex-col items-center p-2 text-xs transition-colors text-muted-foreground hover:text-primary"
                aria-label="Toggle menu"
              >
                <Icon
                  name={isOpen ? 'lucide:X' : 'lucide:Menu'}
                  className="h-5 w-5 mb-1"
                />
                <span>Menu</span>
              </button>
            )}
          </div>
        </Tag>
      </div>
    )
  }

  // If no bottom nav items, show logo + burger only (like EZStart)
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background">
      {/* Burger Menu */}
      {headerNavigation.length > 0 && (
        <div
          className={cn(
            'transition-all duration-500 border-t-2 ease-in-out overflow-hidden px-2',
            isOpen ? 'max-h-[400px] py-2' : 'max-h-0'
          )}
        >
          <MobileNavMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            navigationItems={headerNavigation}
            LinkComponent={LinkComponent}
          />
        </div>
      )}

      {/* Logo + Burger bar */}
      <Tag as="nav" className={cn('border-t', className)}>
        <div className="grid grid-cols-2 items-center w-full">
          <LinkComponent href={logoHref} className="w-full flex justify-center py-2">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt={logoAlt || appName} className="h-6 w-auto" />
            ) : (
              <Icon name={logoIcon} size={24} />
            )}
          </LinkComponent>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex justify-center py-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            <Icon
              name={isOpen ? 'lucide:X' : 'lucide:Menu'}
              size={24}
            />
          </button>
        </div>
      </Tag>
    </div>
  )
}