'use client'

import { useEffect } from 'react'
import { warnDeprecation } from '@ezstart/logger'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'
import { spinnerVariantConfig } from '../../lib/design-system/variants'
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'

export type SpinnerSize =
  | 'xs'
  | 'sm'
  | 'default'
  | 'lg'
  | 'xl'
  | /** @deprecated Use 'default' instead */ 'md'

export interface SpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Variant style */
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'destructive' | 'success' | 'fancy'
  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast'
  /** Optional text to display below spinner */
  text?: string
  /** @deprecated Use size instead */
  textSize?: 'xs' | 'sm' | 'md' | 'lg'
  /** Custom className */
  className?: string
  /** Custom text className */
  textClassName?: string
  /** Full screen overlay */
  fullScreen?: boolean
  /** Show backdrop blur when fullScreen */
  backdrop?: boolean
}

/**
 * Spinner component - Agnostic loading indicator
 *
 * @example
 * // Simple spinner
 * <Spinner />
 *
 * @example
 * // With text
 * <Spinner text="Loading..." />
 *
 * @example
 * // Primary variant, large size
 * <Spinner variant="primary" size="lg" />
 *
 * @example
 * // Fancy variant with pulse effect (EZBill style)
 * <Spinner variant="fancy" size="xl" text="Loading your dashboard..." />
 *
 * @example
 * // Full screen loading
 * <Spinner fullScreen backdrop text="Please wait..." />
 */
export function Spinner({
  size: sizeProp,
  variant = 'default',
  speed = 'normal',
  text,
  textSize = 'sm',
  className,
  textClassName,
  fullScreen = false,
  backdrop = false,
}: SpinnerProps) {
  const inherited = useDesignTokens()
  const size = (sizeProp ?? inherited.size ?? 'default') as NonNullable<SpinnerProps['size']>
  const isFancy = variant === 'fancy'

  // Surface deprecation warnings for legacy size value and `textSize` prop.
  useEffect(() => {
    if (sizeProp === ('md' as SpinnerSize)) {
      warnDeprecation("Spinner size='md'", "size='default'", {
        toast: msg => toast.warning(msg),
      })
    }
  }, [sizeProp])
  useEffect(() => {
    // textSize default is 'sm' — only warn when consumer explicitly passes a non-default value.
    // Detection trick : we can't differentiate default 'sm' from explicit 'sm', so we accept
    // the false negative for 'sm' and warn on every other explicit value.
    if (textSize !== 'sm') {
      warnDeprecation('Spinner.textSize', 'size prop', {
        toast: msg => toast.warning(msg),
      })
    }
  }, [textSize])

  const spinner = isFancy ? (
    // Fancy variant with pulse effect (EZBill style)
    <div className="relative">
      <div
        className={cn(
          'rounded-full border-solid',
          spinnerVariantConfig.size[size],
          spinnerVariantConfig.variant[variant],
          spinnerVariantConfig.speed[speed],
          className
        )}
        role="status"
        aria-label={text || 'Loading'}
      />
      <div
        className={cn(
          'absolute bg-gradient-to-r from-primary to-primary/80 rounded-full opacity-20 animate-pulse',
          spinnerVariantConfig.fancyPulseSize[size]
        )}
        aria-hidden="true"
      />
    </div>
  ) : (
    // Standard spinner
    <div
      className={cn(
        'rounded-full border-solid',
        spinnerVariantConfig.size[size],
        spinnerVariantConfig.variant[variant],
        spinnerVariantConfig.speed[speed],
        className
      )}
      role="status"
      aria-label={text || 'Loading'}
    />
  )

  const content = (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', fullScreen && 'h-screen')}
    >
      {spinner}
      {text && (
        <p
          className={cn(
            'text-muted-foreground',
            spinnerVariantConfig.textSize[textSize],
            textClassName
          )}
        >
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          backdrop && 'bg-background/80 backdrop-blur-sm'
        )}
      >
        {content}
      </div>
    )
  }

  return content
}

// Export component with display name for better debugging
Spinner.displayName = 'Spinner'
