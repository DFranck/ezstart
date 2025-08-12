'use client'

import { Button, Icon } from '@ezstart/ui/components'
import { ReactNode } from 'react'

interface LoadingButtonProps {
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
  loadingText?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  icon?: string
  loadingIcon?: string
  showSpinner?: boolean
}

export function LoadingButton({
  loading = false,
  disabled = false,
  onClick,
  children,
  loadingText,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
  loadingIcon = 'fa:FaSpinner',
  showSpinner = true
}: LoadingButtonProps) {
  const isDisabled = disabled || loading
  const displayText = loading && loadingText ? loadingText : children
  const displayIcon = loading ? loadingIcon : icon

  return (
    <Button
      variant={variant}
      size={size}
      disabled={isDisabled}
      onClick={onClick}
      className={`relative ${className}`}
    >
      {displayIcon && (
        <Icon
          name={displayIcon}
          className={`mr-2 ${loading && showSpinner ? 'animate-spin' : ''}`}
        />
      )}
      {displayText}
      {loading && showSpinner && !displayIcon && (
        <Icon
          name="fa:FaSpinner"
          className="ml-2 animate-spin"
        />
      )}
    </Button>
  )
}