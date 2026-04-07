'use client'

import { cn } from '../../lib/utils'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface InfiniteMovingCardsProps {
  children: ReactNode
  direction?: 'left' | 'right'
  speed?: 'fast' | 'normal' | 'slow'
  pauseOnHover?: boolean
  className?: string
}

export function InfiniteMovingCards({
  children,
  direction = 'left',
  speed = 'normal',
  pauseOnHover = true,
  className,
}: InfiniteMovingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState(false)

  useEffect(() => {
    addAnimation()
  }, [])

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children)

      // Duplicate all children for seamless loop
      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true)
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem)
        }
      })

      getDirection()
      getSpeed()
      setStart(true)
    }
  }

  function getDirection() {
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        '--animation-direction',
        direction === 'left' ? 'forwards' : 'reverse'
      )
    }
  }

  function getSpeed() {
    if (containerRef.current) {
      const duration = speed === 'fast' ? '20s' : speed === 'normal' ? '40s' : '80s'
      containerRef.current.style.setProperty('--animation-duration', duration)
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('scroller relative z-20 overflow-hidden', className)}
    >
      <div
        ref={scrollerRef}
        className={cn(
          'flex min-w-full shrink-0 gap-3 w-max flex-nowrap',
          start && 'animate-scroll',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
      >
        {children}
      </div>
    </div>
  )
}
