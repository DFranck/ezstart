'use client'

import { Button } from '@ezstart/ui/components'
import type { ComponentProps } from 'react'

interface DonateButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  onClick?: () => void
}

export function DonateButton({ onClick, children, ...props }: DonateButtonProps) {
  return (
    <Button onClick={onClick} {...props}>
      {children || '❤️ Donate'}
    </Button>
  )
}
