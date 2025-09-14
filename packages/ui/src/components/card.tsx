import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../lib/utils'

const cardVariants = cva('text-card-foreground flex flex-col rounded-xl border shadow-sm', {
  variants: {
    variant: {
      default: 'bg-card',
      ghost: 'bg-transparent border-transparent shadow-none',
      floating:
        'bg-background/70 backdrop-blur-sm border-background/20 shadow-lg shadow-foreground/10',
      dark: 'bg-foreground border-foreground shadow-2xl text-background',
      premium:
        'bg-gradient-to-r from-indigo-50 via-white to-cyan-50 border-indigo-200/30 shadow-xl',
      elevated: 'bg-card shadow-2xl border-border/50',
    },
    size: {
      xs: 'gap-2 py-2',
      sm: 'gap-3 py-3',
      default: 'gap-4 py-4',
      lg: 'gap-6 py-4 md:py-6',
      xl: 'gap-8 py-6 md:py-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

interface CardProps extends React.ComponentProps<'div'>, VariantProps<typeof cardVariants> {}

function Card({ className, variant, size, ...props }: CardProps) {
  return (
    <div data-slot="card" className={cn(cardVariants({ variant, size }), className)} {...props} />
  )
}

interface CardHeaderProps extends React.ComponentProps<'div'> {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

function CardHeader({ className, size = 'default', ...props }: CardHeaderProps) {
  const sizeClasses = {
    xs: 'px-3 gap-1',
    sm: 'px-4 gap-1.5',
    default: 'px-6 gap-1.5',
    lg: 'px-6 gap-2',
    xl: 'px-8 gap-2.5',
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
    xs: 'px-2',
    sm: 'px-4',
    default: 'px-6',
    lg: 'px-6',
    xl: 'px-8',
  }

  return <div data-slot="card-content" className={cn(sizeClasses[size], className)} {...props} />
}

interface CardFooterProps extends React.ComponentProps<'div'> {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

function CardFooter({ className, size = 'default', ...props }: CardFooterProps) {
  const sizeClasses = {
    xs: 'px-3',
    sm: 'px-4',
    default: 'px-6',
    lg: 'px-6',
    xl: 'px-8',
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
