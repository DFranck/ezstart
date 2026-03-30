'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import type { ThreadMessage } from './types'

type ThreadProps = {
  children: ReactNode
  className?: string
  messages?: ThreadMessage[]
  streamingText?: string
  autoScroll?: boolean
}

export function Thread({
  children,
  className,
  messages = [],
  streamingText = '',
  autoScroll = true,
}: ThreadProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, streamingText, autoScroll])

  return (
    <main
      role="main"
      aria-label="Conversation thread"
      className={cn('flex flex-col flex-1 overflow-y-auto w-full', className)}
    >
      <div className="flex flex-col flex-1 min-h-full py-4">
        <div aria-hidden className="pointer-events-none h-px w-px" />
        <div className="flex flex-col text-sm gap-4 pl-[18px] pr-4 md:pr-2 flex-1 w-full justify-end">
          {children}
        </div>
        <div ref={bottomRef} aria-hidden className="pointer-events-none h-px w-px" />
      </div>
    </main>
  )
}
