'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../lib/utils'
import { switchVariantConfig, switchThumbVariantConfig } from '../../lib/design-system/variants'

const switchVariants = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: switchVariantConfig,
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0',
  {
    variants: switchThumbVariantConfig,
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {
  className?: string
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, variant, size, ...props }, ref) => (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(switchVariants({ variant, size, className }))}
      {...props}
      ref={ref}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(switchThumbVariants({ variant, size }))}
      />
    </SwitchPrimitive.Root>
  )
)
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch, switchVariants }
