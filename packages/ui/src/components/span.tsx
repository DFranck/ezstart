import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Span Component - Semantic wrapper for inline elements
 *
 * A semantic replacement for <span> with proper TypeScript types
 *
 * @example
 * <Span className="text-muted-foreground">Optional text</Span>
 */
export interface SpanProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Span = React.forwardRef<HTMLSpanElement, SpanProps>(
  ({ className, ...props }, ref) => {
    return <span ref={ref} className={cn(className)} {...props} />
  }
)

Span.displayName = 'Span'
