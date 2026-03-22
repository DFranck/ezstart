'use client'

import { Div, P } from '@ezstart/ui/components'

interface StatDisplayProps {
  label: string
  value: string
}

export function StatDisplay({ label, value }: StatDisplayProps) {
  return (
    <Div className="flex items-center justify-between py-1">
      <P className="text-sm text-muted-foreground uppercase">{label}</P>
      <P className="text-sm font-medium">{value}</P>
    </Div>
  )
}
