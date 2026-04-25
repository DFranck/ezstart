'use client'

import { logger } from './internal-logger.js'
import { Button, Icon, KnownIconName, Span } from '@ezstart/ui/components'
import { useAuth } from '../react/hooks.js'
import { detectCurrentThemePreference } from './themePreference.js'

export interface RegisterButtonProps {
  children?: React.ReactNode
  className?: string
  registerText?: string
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
   * `?theme=<value>`. Same semantics as {@link LoginButton.theme}.
   */
  theme?: 'light' | 'dark' | 'system'
}

/**
 * Register CTA that redirects the user to the EZAuth register page.
 *
 * Drop-in replacement for `<Link href="/register">` in consumer apps — unlike
 * a local link, it builds the proper cross-origin URL to the EZAuth web app
 * (using the configured `publishableKey` or `appName`) and a matching
 * `redirect_uri` back to the current app's `/auth/callback`.
 *
 * Mirrors the API and UX of {@link LoginButton}.
 *
 * @example
 * ```tsx
 * const t = useTranslations('landing')
 * <RegisterButton size="lg">{t('heroCta')}</RegisterButton>
 * ```
 */
export function RegisterButton({
  children,
  className,
  registerText = 'Sign up with EZAuth',
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
}: RegisterButtonProps) {
  const { register, isLoggingIn, setLoggingIn } = useAuth()

  const loading = externalLoading ?? isLoggingIn
  const buttonText = children ?? registerText

  const handleClick = async () => {
    if (loading || disabled) return

    onClick?.()

    setLoggingIn(true)

    try {
      const resolvedTheme = theme ?? detectCurrentThemePreference()
      const extraParams = resolvedTheme ? { theme: resolvedTheme } : undefined
      await register(extraParams) // redirects, so loading state persists
    } catch (error) {
      logger.error(
        'Register redirect failed:',
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
        showIcon && <Icon name={icon ? icon : 'fa:FaUserPlus'} className="md:mr-2" />
      )}
      <Span className={alwaysShowText ? '' : 'hidden md:inline'}>
        {loading ? loadingText : buttonText}
      </Span>
    </Button>
  )
}
