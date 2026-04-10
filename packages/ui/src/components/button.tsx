import { Slot } from '@radix-ui/react-slot'
import { type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../lib/utils'
import { buttonVariants } from '../lib/design-system/variants'
import { useDesignTokens } from '../lib/design-system/DesignTokenContext'
import { radius as radiusTokens } from '../lib/design-system/tokens'

/** Density-based vertical padding adjustments for Button */
const buttonDensityClasses: Record<string, string> = {
  compact: 'py-0.5',
  relaxed: 'py-3',
}

function Button({
  className,
  variant,
  size: sizeProp,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const inherited = useDesignTokens()
  const size = (sizeProp ?? inherited.size) as VariantProps<typeof buttonVariants>['size']
  const density = inherited.density as string | undefined
  const inheritedRadius = inherited.radius as keyof typeof radiusTokens | undefined
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        density && buttonDensityClasses[density],
        inheritedRadius && radiusTokens[inheritedRadius]
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
