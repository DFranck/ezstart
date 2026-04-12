'use client'

import React from 'react'
import { cn } from '../../lib/utils'

type ThreadHeaderProps = {
  left?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export const ThreadHeader = React.memo(function ThreadHeader({
  left,
  right,
  className,
}: ThreadHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 py-3 shrink-0',
        'bg-background',
        'border-b',
        className
      )}
    >
      {/* Left slot */}
      <div className="flex items-center gap-2">{left}</div>

      {/* Right slot */}
      <div className="flex items-center gap-2">{right}</div>
    </header>
  )
})
