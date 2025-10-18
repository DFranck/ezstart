import { cn } from '../lib/utils'

export interface SpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Variant style */
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'destructive' | 'success'
  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast'
  /** Optional text to display below spinner */
  text?: string
  /** Text size */
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

const sizeStyles = {
  xs: 'w-3 h-3 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
}

const variantStyles = {
  default: 'border-border border-t-foreground',
  primary: 'border-primary/30 border-t-primary',
  secondary: 'border-secondary/30 border-t-secondary',
  accent: 'border-accent/30 border-t-accent',
  destructive: 'border-destructive/30 border-t-destructive',
  success: 'border-green-500/30 border-t-green-500',
}

const speedStyles = {
  slow: 'animate-spin-slow',
  normal: 'animate-spin',
  fast: 'animate-spin-fast',
}

const textSizeStyles = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
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
 * // Full screen loading
 * <Spinner fullScreen backdrop text="Please wait..." />
 */
export function Spinner({
  size = 'md',
  variant = 'default',
  speed = 'normal',
  text,
  textSize = 'sm',
  className,
  textClassName,
  fullScreen = false,
  backdrop = false,
}: SpinnerProps) {
  const spinner = (
    <div
      className={cn(
        'rounded-full border-solid',
        sizeStyles[size],
        variantStyles[variant],
        speedStyles[speed],
        className
      )}
      role="status"
      aria-label={text || 'Loading'}
    />
  )

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', fullScreen && 'h-screen')}>
      {spinner}
      {text && (
        <p className={cn('text-muted-foreground', textSizeStyles[textSize], textClassName)}>{text}</p>
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
