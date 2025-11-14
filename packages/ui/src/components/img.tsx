import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Img Component - Semantic wrapper for images
 *
 * A semantic replacement for <img> with proper TypeScript types
 *
 * @example
 * <Img src="/avatar.jpg" alt="User avatar" className="w-8 h-8 rounded-full" />
 */
export interface ImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export const Img = React.forwardRef<HTMLImageElement, ImgProps>(
  ({ className, ...props }, ref) => {
    return <img ref={ref} className={cn(className)} {...props} />
  }
)

Img.displayName = 'Img'
