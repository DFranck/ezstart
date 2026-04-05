import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { paddingX, gap, paddingY } from '../../lib/design-system/tokens'
import {
  cardVariantConfig,
  cardHeaderVariantConfig,
  cardContentVariantConfig,
} from '../../lib/design-system/variants'

/**
 * Card Component - Interactive & Configurable
 *
 * Versatile card with multiple variants, interactive states, and flexible sizing.
 *
 * @example
 * // Basic card
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>Content</CardContent>
 * </Card>
 *
 * @example
 * // Interactive clickable card
 * <Card interactive hover="lift" onClick={() => {}}>
 *   <CardContent>Click me!</CardContent>
 * </Card>
 */

const cardVariants = cva('text-card-foreground flex flex-col rounded-xl border transition-all', {
  variants: {
    variant: {
      default: 'bg-card shadow-sm shadow-foreground/5',
      outline: 'bg-card border-border hover:border-primary/50 shadow-sm',
      ghost: 'bg-transparent border-transparent shadow-none',
      floating:
        'bg-background/70 backdrop-blur-sm border-background/20 shadow-lg shadow-foreground/10',
      dark: 'bg-foreground border-foreground shadow-2xl shadow-foreground/20 text-background',
      premium:
        'bg-gradient-to-r from-primary/5 via-background to-accent/5 border-primary/20 shadow-xl shadow-foreground/10',
      elevated: 'bg-card shadow-2xl shadow-foreground/10 border-border/50',
    },
    size: {
      ...cardVariantConfig.size,
      sm: [gap.normal, paddingY.md].join(' '),
      xl: [gap.loose, 'py-6 sm:py-6 md:py-8'].join(' '),
    },
    interactive: {
      true: 'cursor-pointer',
      false: '',
    },
    hover: {
      none: '',
      lift: 'hover:-translate-y-1 hover:shadow-xl',
      glow: 'hover:shadow-xl hover:shadow-primary/20',
      border: 'hover:border-primary',
      scale: 'hover:scale-[1.02]',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
    interactive: false,
    hover: 'none',
  },
})

interface CardProps extends React.ComponentProps<'div'>, VariantProps<typeof cardVariants> {}

function Card({ className, variant, size, interactive, hover, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, size, interactive, hover }), className)}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    />
  )
}

interface CardHeaderProps extends React.ComponentProps<'div'> {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

function CardHeader({ className, size = 'default', ...props }: CardHeaderProps) {
  const sizeClasses = {
    ...cardHeaderVariantConfig.size,
    xs: cn(paddingX.default, gap.tight),
    sm: cn(paddingX.default, gap.sm),
  }

  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min grid-rows-[auto_auto] items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

interface CardContentProps extends React.ComponentProps<'div'> {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

function CardContent({ className, size = 'default', ...props }: CardContentProps) {
  const sizeClasses = {
    ...cardContentVariantConfig.size,
    xs: paddingX.sm,
    sm: paddingX.default,
  }

  return <div data-slot="card-content" className={cn(sizeClasses[size], className)} {...props} />
}

interface CardFooterProps extends React.ComponentProps<'div'> {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

function CardFooter({ className, size = 'default', ...props }: CardFooterProps) {
  const sizeClasses = {
    ...cardContentVariantConfig.size,
    xs: paddingX.sm,
    sm: paddingX.default,
  }

  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center [.border-t]:pt-6', sizeClasses[size], className)}
      {...props}
    />
  )
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
