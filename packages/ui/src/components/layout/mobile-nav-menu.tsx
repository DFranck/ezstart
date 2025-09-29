'use client'

import { forwardRef } from 'react'
import { Icon } from '../'
import { cn } from '../../lib'
import { NavigationItem } from './types'

interface MobileNavMenuProps {
  isOpen: boolean
  onClose: () => void
  navigationItems: NavigationItem[]
  LinkComponent?: React.ComponentType<any> | string
  className?: string
}

export const MobileNavMenu = forwardRef<HTMLDivElement, MobileNavMenuProps>(
  ({ isOpen, onClose, navigationItems, LinkComponent = 'a', className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'transition-all duration-500 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[400px] py-4 bg-background border-b' : 'max-h-0 py-0',
          className
        )}
      >
        <nav className="px-6 flex flex-col gap-2">
          {navigationItems.map(item => (
            <LinkComponent
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors font-medium"
            >
              {item.icon && <Icon name={item.icon} className="h-5 w-5" />}
              <span>{item.label}</span>
            </LinkComponent>
          ))}
        </nav>
      </div>
    )
  }
)

MobileNavMenu.displayName = 'MobileNavMenu'
