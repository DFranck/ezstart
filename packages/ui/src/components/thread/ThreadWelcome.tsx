'use client'

import { cn } from '../../lib/utils'

type ThreadWelcomeProps = {
  title?: string
  description?: string
  show?: boolean
  className?: string
}

export function ThreadWelcome({
  title = 'Welcome',
  description,
  show = true,
  className,
}: ThreadWelcomeProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        `${show ? '-translate-y-12 md:-translate-y-20' : 'opacity-0'}`,
        'flex flex-col items-center justify-center text-center text-foreground transition-all duration-300 ease-in-out',
        className
      )}
    >
      <h1 className="text-xl font-semibold">{title}</h1>
      {description && <p className="text-sm">{description}</p>}
    </div>
  )
}
