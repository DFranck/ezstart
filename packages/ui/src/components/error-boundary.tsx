'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { Card, CardContent } from './card'
import { Icon } from './icon'
import { H3, P } from './tag'
import { toast } from 'sonner'

/**
 * ErrorBoundary Component - Catch React errors and display fallback UI
 *
 * Universal error boundary for all @ezstart apps with:
 * - Auto-detection of dev/prod environment
 * - Retry mechanism with attempt counter
 * - Sentry integration via onError callback
 * - Customizable fallback UI
 * - Accessibility support
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With Sentry integration
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     Sentry.captureException(error, { extra: errorInfo })
 *   }}
 * >
 *   <MyApp />
 * </ErrorBoundary>
 *
 * @example
 * // Custom messages and styling
 * <ErrorBoundary
 *   title="Oops! Something went wrong"
 *   description="Don't worry, your data is safe"
 *   variant="full"
 *   showResetButton={true}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */

export interface ErrorBoundaryProps {
  children: ReactNode

  /** Custom fallback UI (overrides default) */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode)

  /** Error title */
  title?: string

  /** Error description */
  description?: string

  /** Show "Try Again" button */
  showResetButton?: boolean

  /** Show technical error details (dev only by default) */
  showDetails?: boolean

  /** Callback when error occurs (use for Sentry, logging, etc.) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void

  /** Callback when user clicks "Try Again" */
  onReset?: () => void

  /** Custom className for the error container */
  className?: string

  /** Visual variant */
  variant?: 'default' | 'minimal' | 'full'

  /** Max retry attempts before showing permanent error */
  maxRetries?: number
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Store error info in state
    this.setState({ errorInfo })

    // Call onError callback if provided (for Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetError = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    // Check if max retries exceeded
    if (retryCount >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) exceeded. Error boundary will not reset.`)
      return
    }

    // Call onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset()
    }

    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
    })
  }

  copyErrorToClipboard = () => {
    const { error, errorInfo } = this.state

    if (!error) return

    const errorText = `Error: ${error.toString()}\n\nComponent Stack:\n${errorInfo?.componentStack || 'N/A'}\n\nUser Agent: ${navigator.userAgent}\nTimestamp: ${new Date().toISOString()}`

    navigator.clipboard
      .writeText(errorText)
      .then(() => {
        toast.success('Error copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy error:', err)
        toast.error('Failed to copy error')
      })
  }

  render() {
    const {
      children,
      fallback,
      title = 'Something went wrong',
      description = 'We encountered an unexpected error. Please try again.',
      showResetButton = true,
      showDetails,
      className,
      variant = 'full',
      maxRetries = 3,
    } = this.props

    const { hasError, error, errorInfo, retryCount } = this.state

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.resetError)
        }
        return fallback
      }

      // Default fallback UI
      const isDev = process.env.NODE_ENV === 'development'
      const shouldShowDetails = showDetails !== undefined ? showDetails : isDev
      const maxRetriesExceeded = retryCount >= maxRetries

      // Variant: minimal
      if (variant === 'minimal') {
        return (
          <div
            className={cn('flex flex-col items-center justify-center gap-4 p-8', className)}
            role="alert"
            aria-live="assertive"
          >
            <Icon name="lucide:AlertCircle" className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <P className="font-medium">{title}</P>
              <P className="text-sm text-muted-foreground">{description}</P>
            </div>
            {showResetButton && !maxRetriesExceeded && (
              <div className="flex gap-2">
                <Button onClick={this.resetError} variant="outline" size="sm">
                  <Icon name="lucide:RotateCcw" className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.copyErrorToClipboard} variant="ghost" size="sm">
                  <Icon name="lucide:Copy" className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            )}
          </div>
        )
      }

      // Variant: full (full page)
      if (variant === 'full') {
        return (
          <div
            className={cn(
              'flex min-h-screen items-center justify-center bg-background p-4',
              className
            )}
            role="alert"
            aria-live="assertive"
          >
            <Card variant="outline" className="max-w-lg border-destructive">
              <CardContent className="p-8 text-center">
                <Icon
                  name="lucide:AlertCircle"
                  className="mx-auto mb-4 h-16 w-16 text-destructive"
                />
                <H3 className="mb-2">{title}</H3>
                <P className="text-muted-foreground">{description}</P>

                {shouldShowDetails && errorInfo && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-sm font-medium">
                      Technical details
                    </summary>
                    <pre className="mt-2 overflow-auto rounded-md bg-muted p-4 text-xs">
                      {error.toString()}
                      {'\n\n'}
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                {maxRetriesExceeded && (
                  <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Maximum retry attempts reached. Please refresh the page or contact support.
                  </div>
                )}

                <div className="mt-6 flex justify-center gap-3 flex-wrap">
                  {showResetButton && !maxRetriesExceeded && (
                    <Button onClick={this.resetError} variant="destructive">
                      <Icon name="lucide:RotateCcw" className="mr-2 h-4 w-4" />
                      Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    <Icon name="lucide:RefreshCw" className="mr-2 h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button variant="ghost" onClick={this.copyErrorToClipboard}>
                    <Icon name="lucide:Copy" className="mr-2 h-4 w-4" />
                    Copy Error
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      // Variant: default (inline card)
      return (
        <div className={cn('w-full', className)} role="alert" aria-live="assertive">
          <Card variant="outline" className="border-destructive">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Icon
                  name="lucide:AlertCircle"
                  className="h-6 w-6 flex-shrink-0 text-destructive"
                />
                <div className="flex-1">
                  <H3 className="text-base mb-1">{title}</H3>
                  <P className="text-sm text-muted-foreground">{description}</P>

                  {shouldShowDetails && errorInfo && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                        Show technical details
                      </summary>
                      <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {error.toString()}
                        {'\n\n'}
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}

                  {maxRetriesExceeded && (
                    <div className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      Maximum retry attempts reached. Please refresh the page.
                    </div>
                  )}

                  {showResetButton && !maxRetriesExceeded && (
                    <div className="mt-4 flex gap-2">
                      <Button onClick={this.resetError} variant="destructive" size="sm">
                        <Icon name="lucide:RotateCcw" className="mr-2 h-3 w-3" />
                        Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                      </Button>
                      <Button onClick={this.copyErrorToClipboard} variant="ghost" size="sm">
                        <Icon name="lucide:Copy" className="mr-2 h-3 w-3" />
                        Copy Error
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return children
  }
}
