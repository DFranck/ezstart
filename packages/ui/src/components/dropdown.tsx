'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { LI, UL } from './tag'

/**
 * Dropdown Component - 100% Configurable Menu
 *
 * Fully accessible dropdown with keyboard navigation, customizable positioning,
 * and flexible item rendering.
 *
 * @example
 * // Basic usage
 * <Dropdown
 *   label="Actions"
 *   items={[
 *     { label: 'Edit', value: 'edit', onSelect: () => {} },
 *     { label: 'Delete', value: 'delete', onSelect: () => {} }
 *   ]}
 * />
 *
 * @example
 * // Custom trigger
 * <Dropdown
 *   trigger={<Button variant="outline">Open Menu</Button>}
 *   items={items}
 * />
 *
 * @example
 * // Custom positioning and width
 * <Dropdown
 *   label="Options"
 *   items={items}
 *   align="start"
 *   side="bottom"
 *   fullWidth
 * />
 */

export interface DropdownItem {
  /** Item label (string or ReactNode for icons) */
  label: React.ReactNode
  /** Unique value for the item */
  value: string
  /** Callback when item is selected */
  onSelect?: () => void
  /** Disable the item */
  disabled?: boolean
  /** Show divider after this item */
  divider?: boolean
  /** Custom icon */
  icon?: React.ReactNode
}

export interface DropdownProps {
  /** Button label (used if trigger not provided) */
  label?: React.ReactNode
  /** Custom trigger element (replaces default button) */
  trigger?: React.ReactNode
  /** Menu items */
  items: DropdownItem[]
  /** Button variant (when using label) */
  variant?: 'default' | 'ghost' | 'secondary' | 'outline' | 'destructive' | 'link' | null
  /** Horizontal alignment relative to trigger */
  align?: 'start' | 'center' | 'end'
  /** Vertical side relative to trigger */
  side?: 'top' | 'bottom'
  /** Menu width matches trigger width */
  fullWidth?: boolean
  /** Custom menu className */
  menuClassName?: string
  /** Custom container className */
  className?: string
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
}

export function Dropdown({
  label,
  trigger,
  items,
  variant = 'ghost',
  align = 'end',
  side = 'bottom',
  fullWidth = false,
  menuClassName,
  className,
  open: controlledOpen,
  onOpenChange,
}: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(value)
    }
    onOpenChange?.(value)
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  const menuId = useId()

  // Compute menu position classes
  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(i => (i === null ? 0 : (i + 1) % items.length))
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(i =>
          i === null ? items.length - 1 : (i - 1 + items.length) % items.length
        )
      }

      if (e.key === 'Enter' && focusedIndex != null) {
        const item = items[focusedIndex]
        item?.onSelect?.()
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, items, focusedIndex])

  // Manage focus when menu opens
  useEffect(() => {
    if (open) {
      setFocusedIndex(null)
    }
  }, [open])

  // Render trigger
  const triggerElement = trigger ? (
    <div
      onClick={() => setOpen(!open)}
      ref={buttonRef as unknown as React.RefObject<HTMLDivElement>}
      role="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen(!open)
        }
      }}
    >
      {trigger}
    </div>
  ) : (
    <Button
      variant={variant}
      ref={buttonRef}
      onClick={() => setOpen(!open)}
      className={cn(fullWidth && 'w-full')}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
    >
      {label}
    </Button>
  )

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {triggerElement}

      {open && (
        <UL
          id={menuId}
          role="menu"
          ref={menuRef}
          variant={'outline'}
          layout={'menu'}
          className={cn(
            'absolute z-50 focus:outline-none bg-background shadow-lg',
            alignClasses[align],
            sideClasses[side],
            fullWidth && 'w-full',
            menuClassName
          )}
        >
          {items.map(({ label, onSelect, value, disabled, divider, icon }, i) => (
            <div key={value}>
              <Button
                variant={'ghost'}
                asChild
                className={cn(
                  'w-full justify-start mb-0',
                  disabled && 'opacity-50 cursor-not-allowed',
                  focusedIndex === i && 'bg-accent'
                )}
                role="menuitem"
                size={'sm'}
                onClick={() => {
                  if (!disabled) {
                    onSelect?.()
                    setOpen(false)
                  }
                }}
                tabIndex={-1}
                disabled={disabled}
              >
                <LI className="flex items-center gap-2">
                  {icon && <span className="shrink-0">{icon}</span>}
                  <span>{label}</span>
                </LI>
              </Button>
              {divider && <div className="h-px bg-border my-1" role="separator" />}
            </div>
          ))}
        </UL>
      )}
    </div>
  )
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use named export Dropdown instead
 */
export default Dropdown
