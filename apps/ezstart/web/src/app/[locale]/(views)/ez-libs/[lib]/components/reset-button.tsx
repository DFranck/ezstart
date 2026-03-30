'use client'

import { Button, Icon, Span } from '@ezstart/ui/components'

type ResetButtonProps = {
  onReset: () => void
  className?: string
}

export function ResetButton({ onReset, className }: ResetButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onReset}
      className={className}
      aria-label="Reset to default values"
    >
      <Icon name="lucide:RotateCcw" size={16} ariaHidden />
      <Span className="ml-2">Reset</Span>
    </Button>
  )
}
