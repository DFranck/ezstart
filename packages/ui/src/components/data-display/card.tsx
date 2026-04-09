import { type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { DesignTokenProvider, useDesignTokens } from '../../lib/design-system/DesignTokenContext'
import { paddingX, gap } from '../../lib/design-system/tokens'
import {
  cardVariants,
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

interface CardProps extends React.ComponentProps<'div'>, VariantProps<typeof cardVariants> {}

function Card({ className, variant, size, interactive, hover, ...props }: CardProps) {
  return (
    <DesignTokenProvider size={size ?? 'default'}>
      <div
        data-slot="card"
        className={cn(cardVariants({ variant, size, interactive, hover }), className)}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      />
    </DesignTokenProvider>
  )
}

interface CardHeaderProps extends React.ComponentProps<'div'> {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

function CardHeader({ className, size: sizeProp, ...props }: CardHeaderProps) {
  const inherited = useDesignTokens()
  const size = (sizeProp ?? inherited.size ?? 'default') as 'xs' | 'sm' | 'default' | 'lg' | 'xl'

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

function CardContent({ className, size: sizeProp, ...props }: CardContentProps) {
  const inherited = useDesignTokens()
  const size = (sizeProp ?? inherited.size ?? 'default') as 'xs' | 'sm' | 'default' | 'lg' | 'xl'

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

function CardFooter({ className, size: sizeProp, ...props }: CardFooterProps) {
  const inherited = useDesignTokens()
  const size = (sizeProp ?? inherited.size ?? 'default') as 'xs' | 'sm' | 'default' | 'lg' | 'xl'

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
