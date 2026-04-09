import { Slot } from '@radix-ui/react-slot'
import { type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../lib/utils'
import { buttonVariants } from '../lib/design-system/variants'
import { useDesignTokens } from '../lib/design-system/DesignTokenContext'

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
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
