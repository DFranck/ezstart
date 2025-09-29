'use client'

import { Button, Icon, KnownIconName } from '@ezstart/ui/components'
import { useState } from 'react'
import { useAuth } from './provider.js'

export interface LoginButtonProps {
  children?: React.ReactNode
  className?: string
  loginText?: string
  logoutText?: string
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
  children,
  className,
  loginText = 'Login with EZAuth',
  logoutText = 'Logout',
  loadingText = 'Redirecting...',
  variant = 'default',
  size = 'default',
  showIcon = true,
  icon,
  disabled = false,
  onClick,
  loading: externalLoading,
}: LoginButtonProps) {
  const { login, logout, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [hasStartedLogin, setHasStartedLogin] = useState(false)

  const loading = externalLoading ?? isLoading ?? hasStartedLogin

  // Set default children based on auth state and translation props
  const defaultChildren = isAuthenticated ? logoutText : loginText
  const buttonText = children ?? defaultChildren

  const handleClick = async () => {
    if (loading || disabled) return

    // Call custom onClick first if provided
    onClick?.()

    setIsLoading(true)
    setHasStartedLogin(true)

    try {
      if (isAuthenticated) {
        logout() // logout is synchronous, just resets store
        setIsLoading(false)
        setHasStartedLogin(false)
      } else {
        await login() // login redirects, so no need to reset loading
      }
    } catch (error) {
      console.error(isAuthenticated ? 'Logout failed:' : 'Login failed:', error)
      setIsLoading(false)
      setHasStartedLogin(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={className}
      aria-label={loading ? loadingText : `${buttonText}`}
    >
      {loading ? (
        <Icon name="fa:FaSpinner" spin className="mr-2" />
      ) : (
        showIcon && <Icon name={icon ? icon : (isAuthenticated ? 'fa:FaSignOutAlt' : 'fa:FaUser')} className="mr-2" />
      )}
      {loading ? loadingText : buttonText}
    </Button>
  )
}
