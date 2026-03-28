'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * Tooltip Component - Enhanced with Positioning & Variants
 *
 * Accessible tooltips with flexible positioning and visual variants.
 * Built on Radix UI primitives for WCAG 2.1 AA compliance.
 *
 * @example
 * // Basic tooltip
 * <Tooltip>
 *   <TooltipTrigger>Hover me</TooltipTrigger>
 *   <TooltipContent>Tooltip text</TooltipContent>
 * </Tooltip>
 *
 * @example
 * // Positioned tooltip
 * <Tooltip>
 *   <TooltipTrigger>Hover me</TooltipTrigger>
 *   <TooltipContent side="top" align="center">
 *     Top center tooltip
 *   </TooltipContent>
 * </Tooltip>
 *
 * @example
 * // Variant styles
 * <Tooltip>
 *   <TooltipTrigger>Info</TooltipTrigger>
 *   <TooltipContent variant="info">
 *     Helpful information
 *   </TooltipContent>
 * </Tooltip>
 */

export type TooltipVariant = 'default' | 'info' | 'success' | 'warning' | 'destructive'

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot='tooltip-provider'
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot='tooltip' {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot='tooltip-trigger' {...props} />;
}

interface TooltipContentProps extends React.ComponentProps<typeof TooltipPrimitive.Content> {
  variant?: TooltipVariant
  hideArrow?: boolean
}

const variantStyles: Record<TooltipVariant, { bg: string; text: string; arrow: string }> = {
  default: {
    bg: 'bg-primary',
    text: 'text-primary-foreground',
    arrow: 'bg-primary fill-primary',
  },
  info: {
    bg: 'bg-blue-600 dark:bg-blue-500',
    text: 'text-white',
    arrow: 'bg-blue-600 fill-blue-600 dark:bg-blue-500 dark:fill-blue-500',
  },
  success: {
    bg: 'bg-green-600 dark:bg-green-500',
    text: 'text-white',
    arrow: 'bg-green-600 fill-green-600 dark:bg-green-500 dark:fill-green-500',
  },
  warning: {
    bg: 'bg-yellow-600 dark:bg-yellow-500',
    text: 'text-white',
    arrow: 'bg-yellow-600 fill-yellow-600 dark:bg-yellow-500 dark:fill-yellow-500',
  },
  destructive: {
    bg: 'bg-destructive',
    text: 'text-destructive-foreground',
    arrow: 'bg-destructive fill-destructive',
  },
}

function TooltipContent({
  className,
  sideOffset = 4,
  variant = 'default',
  hideArrow = false,
  children,
  ...props
}: TooltipContentProps) {
  const styles = variantStyles[variant]

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot='tooltip-content'
        sideOffset={sideOffset}
        className={cn(
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          styles.bg,
          styles.text,
          className
        )}
        {...props}
      >
        {children}
        {!hideArrow && (
          <TooltipPrimitive.Arrow
            className={cn(
              'z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]',
              styles.arrow
            )}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

/**
 * Legacy exports for backward compatibility
 */
export default Tooltip;
