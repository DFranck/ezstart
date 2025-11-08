'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { GripVertical, Maximize2, Minimize2, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../lib'
import { Button } from './button'

const floatingPanelVariants = cva(
  'fixed z-50 bg-card border border-border rounded-lg shadow-lg flex flex-col overflow-hidden',
  {
    variants: {
      size: {
        sm: 'w-80 max-h-96',
        md: 'w-96 max-h-[32rem]',
        lg: 'w-[28rem] max-h-[40rem]',
        xl: 'w-[32rem] max-h-[48rem]',
        full: 'w-[90vw] h-[90vh]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export interface FloatingPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof floatingPanelVariants> {
  /**
   * Title displayed in the panel header (can be string or JSX)
   */
  title?: React.ReactNode

  /**
   * Initial position (defaults to bottom-right)
   */
  defaultPosition?: { x: number; y: number }

  /**
   * Whether the panel can be closed
   */
  closable?: boolean

  /**
   * Callback when panel is closed
   */
  onClose?: () => void

  /**
   * Whether the panel can be minimized
   */
  minimizable?: boolean

  /**
   * Whether the panel can be maximized
   */
  maximizable?: boolean

  /**
   * Whether the panel is open (controlled)
   */
  open?: boolean

  /**
   * Whether the panel is draggable
   */
  draggable?: boolean
}

export function FloatingPanel({
  title,
  defaultPosition,
  closable = true,
  onClose,
  minimizable = false,
  maximizable = false,
  open = true,
  draggable = true,
  size,
  className,
  children,
  ...props
}: FloatingPanelProps) {
  const [position, setPosition] = React.useState(
    defaultPosition || {
      x: typeof window !== 'undefined' ? window.innerWidth - 420 : 0,
      y: typeof window !== 'undefined' ? window.innerHeight - 580 : 0,
    }
  )
  const [isDragging, setIsDragging] = React.useState(false)
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [isMaximized, setIsMaximized] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })

  const panelRef = React.useRef<HTMLDivElement>(null)

  // Handle drag start
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (!draggable) return

      const rect = panelRef.current?.getBoundingClientRect()
      if (!rect) return

      setIsDragging(true)
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    [draggable]
  )

  // Handle dragging
  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      // Keep panel within viewport bounds
      const rect = panelRef.current?.getBoundingClientRect()
      if (!rect) return

      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // Handle window resize - keep panel in bounds
  React.useEffect(() => {
    const handleResize = () => {
      const rect = panelRef.current?.getBoundingClientRect()
      if (!rect) return

      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height

      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY)),
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className={cn(
        floatingPanelVariants({ size: isMaximized ? 'full' : size }),
        isMinimized && 'h-auto max-h-none',
        className
      )}
      style={{
        left: isMaximized ? '5vw' : position.x,
        top: isMaximized ? '5vh' : position.y,
        transition: isDragging ? 'none' : 'all 0.2s ease',
      }}
      {...props}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/50',
          draggable && 'cursor-move',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {draggable && <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          {title && (
            <div className="text-sm font-semibold text-foreground flex items-center gap-2 flex-1 min-w-0">
              {title}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {minimizable && (
            <Button variant="ghost" size="icon" onClick={handleMinimize} className="h-6 w-6">
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {maximizable && (
            <Button variant="ghost" size="icon" onClick={handleMaximize} className="h-6 w-6">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {closable && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-auto p-4" onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  )
}

// Subcomponents for better composition
export function FloatingPanelHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function FloatingPanelTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props}>
      {children}
    </h3>
  )
}

export function FloatingPanelDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  )
}

export function FloatingPanelFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-end gap-2 pt-3', className)} {...props}>
      {children}
    </div>
  )
}
