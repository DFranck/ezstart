'use client'

import { Button, Span } from '@ezstart/ui/components'
import { ReactNode, ComponentProps } from 'react'

interface LoadingButtonProps extends ComponentProps<'button'> {
  loading?: boolean
  loadingText?: string
  children: ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  icon?: string
  size?: 'sm' | 'lg'
}

export function LoadingButton({ 
  loading = false, 
  loadingText = 'Loading...', 
  children, 
  disabled,
  type,
  variant,
  icon,
  size,
  ...props 
}: LoadingButtonProps) {
  return (
    <Button {...props} disabled={disabled || loading} type={type} variant={variant} size={size}>
      <Span>{loading ? loadingText : children}</Span>
    </Button>
  )
}