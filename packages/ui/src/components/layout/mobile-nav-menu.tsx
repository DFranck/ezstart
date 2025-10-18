'use client'

import { forwardRef, useState } from 'react'
import { Icon } from '../'
import { cn } from '../../lib'
import { isNavigationMenu, NavigationLink } from './types'

interface MobileNavMenuProps {
  isOpen: boolean
  onClose: () => void
  navigationItems: NavigationLink[]
  LinkComponent?: React.ComponentType<any> | string
  className?: string
}

export const MobileNavMenu = forwardRef<HTMLDivElement, MobileNavMenuProps>(
  ({ isOpen, onClose, navigationItems, LinkComponent = 'a', className }, ref) => {
    // Track which submenus are open (by index)
    const [openMenus, setOpenMenus] = useState<Set<number>>(new Set())

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

    return (
      <div
        ref={ref}
        className={cn(
          'transition-all duration-500 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[400px] py-4 bg-background border-b overflow-y-auto' : 'max-h-0 py-0',
          className
        )}
      >
        <nav className="px-6 flex flex-col gap-2 items-center">
          {navigationItems.map((item, index) => {
            // Handle menu items (with submenus - collapsible)
            if (isNavigationMenu(item)) {
              const isMenuOpen = openMenus.has(index)
              return (
                <div key={index} className="w-full">
                  {/* Menu label - clickable to toggle */}
                  <button
                    onClick={() => toggleMenu(index)}
                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <Icon name={item.icon} className="h-4 w-4" />}
                      <span>{item.menuLabel}</span>
                    </div>
                    <Icon
                      name="lucide:ChevronDown"
                      className={cn('h-4 w-4 transition-transform', isMenuOpen && 'rotate-180')}
                    />
                  </button>

                  {/* Submenu items - collapsible */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      isMenuOpen ? 'max-h-96 mt-1' : 'max-h-0'
                    )}
                  >
                    <div className="space-y-1 pl-2">
                      {item.menu.map(subItem => (
                        <LinkComponent
                          key={subItem.href}
                          href={subItem.href}
                          onClick={onClose}
                          className="flex items-center justify-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors font-medium w-full text-sm"
                        >
                          {subItem.icon && <Icon name={subItem.icon} className="h-4 w-4" />}
                          <span>{subItem.label}</span>
                        </LinkComponent>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }

            // Handle regular links
            return (
              <LinkComponent
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors font-medium w-full"
              >
                {item.icon && <Icon name={item.icon} className="h-5 w-5" />}
                <span>{item.label}</span>
              </LinkComponent>
            )
          })}
        </nav>
      </div>
    )
  }
)

MobileNavMenu.displayName = 'MobileNavMenu'
