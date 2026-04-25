'use client'

import { logger } from './internal-logger.js'
import { Button, Icon, KnownIconName, Span } from '@ezstart/ui/components'
import { useAuth } from '../react/hooks.js'
import { detectCurrentThemePreference } from './themePreference.js'

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
  /**
   * Override the theme preference propagated to the EZAuth auth pages via
   * `?theme=<value>`. Values: `'light' | 'dark' | 'system'`. When omitted,
   * the component auto-detects the current preference from the
   * `document.documentElement.classList` (set by `next-themes` on the
   * consumer) so the ezauth UI paints in the same scheme — zero flash on
   * redirect. Pass an explicit value only when the consumer does not use
   * next-themes or when a specific override is desired.
   */
  theme?: 'light' | 'dark' | 'system'
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
  theme,
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
        // Resolve the theme value propagated to ezauth: caller override takes
        // priority, otherwise we sniff the consumer's current scheme from
        // the DOM (set by `next-themes`) so the ezauth UI opens in the same
        // light/dark mode — zero flash on redirect.
        const resolvedTheme = theme ?? detectCurrentThemePreference()
        const extraParams = resolvedTheme ? { theme: resolvedTheme } : undefined
        await login(extraParams) // login redirects, so no need to reset loading
      }
    } catch (error) {
      logger.error(
        isAuthenticated ? 'Logout failed:' : 'Login failed:',
        error instanceof Error ? error.message : String(error)
      )
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
      <Span className={alwaysShowText ? '' : 'hidden md:inline'}>
        {loading ? loadingText : buttonText}
      </Span>
    </Button>
  )
}
