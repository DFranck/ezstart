'use client'

import { Button, Icon, KnownIconName } from '@ezstart/ui/components'
import { useState } from 'react'
import { useAuth } from './provider.js'

export interface LoginButtonProps {
  children?: React.ReactNode
  className?: string
  loadingText?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showIcon?: boolean
  icon?: KnownIconName
  disabled?: boolean
  onClick?: () => void
  loading?: boolean
}

export function LoginButton({
  children = 'Login with EZAuth',
  className,
  loadingText = 'Redirecting...',
  variant = 'default',
  size = 'default',
  showIcon = true,
  icon,
  disabled = false,
  onClick,
  loading: externalLoading,
}: LoginButtonProps) {
  const { login, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [hasStartedLogin, setHasStartedLogin] = useState(false)

  const loading = externalLoading ?? isLoading ?? hasStartedLogin

  // Don't show login button if already authenticated
  if (isAuthenticated) {
    return null
  }

  const handleClick = async () => {
    if (loading || disabled) return

    // Call custom onClick first if provided
    onClick?.()

    setIsLoading(true)
    setHasStartedLogin(true)

    try {
      await login()
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoading(false)
      setHasStartedLogin(false)
    }
    // Note: We never reset hasStartedLogin on success since we're redirecting
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={className}
      aria-label={loading ? loadingText : `${children}`}
    >
      {loading ? (
        <Icon name="fa:FaSpinner" spin className="mr-2" />
      ) : (
        showIcon && <Icon name={icon ? icon : 'fa:FaUser'} className="mr-2" />
      )}
      {loading ? loadingText : children}
    </Button>
  )
}
