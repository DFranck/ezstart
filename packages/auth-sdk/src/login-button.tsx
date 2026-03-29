'use client'

import { Button, Icon, KnownIconName } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
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
  /** Always show text on all screen sizes (disable responsive hiding) */
  alwaysShowText?: boolean
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
  alwaysShowText = false,
}: LoginButtonProps) {
  const { login, logout, isAuthenticated, isLoggingIn, setLoggingIn } = useAuth()

  const loading = externalLoading ?? isLoggingIn

  // Set default children based on auth state and translation props
  const defaultChildren = isAuthenticated ? logoutText : loginText
  const buttonText = children ?? defaultChildren

  const handleClick = async () => {
    if (loading || disabled) return

    // Call custom onClick first if provided
    onClick?.()

    setLoggingIn(true)

    try {
      if (isAuthenticated) {
        logout() // logout is synchronous, just resets store
        setLoggingIn(false)
      } else {
        await login() // login redirects, so no need to reset loading
      }
    } catch (error) {
      logger.error(isAuthenticated ? 'Logout failed:' : 'Login failed:', error)
      setLoggingIn(false)
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
        <Icon name="fa:FaSpinner" spin className="md:mr-2" />
      ) : (
        showIcon && (
          <Icon
            name={icon ? icon : isAuthenticated ? 'fa:FaSignOutAlt' : 'fa:FaUser'}
            className="md:mr-2"
          />
        )
      )}
      <span className={alwaysShowText ? '' : 'hidden md:inline'}>
        {loading ? loadingText : buttonText}
      </span>
    </Button>
  )
}
