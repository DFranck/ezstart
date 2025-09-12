'use client'

import { useState } from 'react'
import { Icon } from './icon'
import type { KnownIconName } from './icon/src/types'

export interface AnimatedIconToggleProps {
  icon1: KnownIconName
  icon2: KnownIconName
  isToggled: boolean
  onToggle?: () => void
  className?: string
  size?: string | number
  animationDuration?: string
  disabled?: boolean
}

export function AnimatedIconToggle({
  icon1,
  icon2,
  isToggled,
  onToggle,
  className = 'w-4 h-4',
  size = 16,
  animationDuration = '0.3s',
  disabled = false,
}: AnimatedIconToggleProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleToggle = () => {
    if (disabled) return
    
    setIsAnimating(true)
    onToggle?.()
    setTimeout(() => setIsAnimating(false), 100)
  }

  const cubicBezier = 'cubic-bezier(0.4, 0, 0.2, 1)'

  return (
    <div
      className={`relative cursor-pointer ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleToggle}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        transform: isAnimating ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: `transform ${animationDuration} ${cubicBezier}`,
      }}
    >
      <Icon
        name={icon1}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: isToggled ? 0 : 1,
          transform: isToggled ? 'scale(0)' : 'scale(1)',
          transition: `all ${animationDuration} ${cubicBezier}`,
        }}
      />
      <Icon
        name={icon2}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: isToggled ? 1 : 0,
          transform: isToggled ? 'scale(1)' : 'scale(0)',
          transition: `all ${animationDuration} ${cubicBezier}`,
        }}
      />
    </div>
  )
}