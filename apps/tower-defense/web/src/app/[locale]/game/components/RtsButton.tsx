'use client'

import { Button, Icon, KnownIconName } from '@ezstart/ui/components'
import { useState } from 'react'

interface RtsButtonProps {
  onClick: () => void
  disabled?: boolean
  cooldown?: number // Cooldown en ms
  icon?: string
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function RtsButton({
  onClick,
  disabled = false,
  cooldown = 300,
  icon,
  style,
  className,
  children,
  size = 'icon',
}: RtsButtonProps) {
  const [isOnCooldown, setIsOnCooldown] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleClick = () => {
    if (isOnCooldown || disabled) return

    onClick()

    // Start cooldown avec CSS animation
    setIsOnCooldown(true)

    // Force un re-render pour déclencher la transition CSS
    requestAnimationFrame(() => {
      setProgress(100)
    })

    setTimeout(() => {
      setIsOnCooldown(false)
      setProgress(0)
    }, cooldown)
  }

  // Animation du cercle qui se vide (effet horloge)
  const angle = (progress / 100) * 360

  return (
    <Button
      size={size}
      onClick={handleClick}
      disabled={disabled || isOnCooldown}
      style={style}
      className={`relative overflow-hidden ${className || ''}`}
    >
      {/* Content */}
      <div className="relative z-10">
        {icon && <Icon name={icon as KnownIconName} className="text-white" />}
        {children}
      </div>

      {/* Cooldown radial overlay - effet horloge (noir qui se vide) */}
      {isOnCooldown && (
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/* Pie slice noir qui diminue progressivement */}
            <path
              d={`M 50,50 L 50,0 A 50,50 0 ${angle > 180 ? 1 : 0},1 ${
                50 + 50 * Math.sin((angle * Math.PI) / 180)
              },${50 - 50 * Math.cos((angle * Math.PI) / 180)} Z`}
              fill="rgba(0, 0, 0, 0.7)"
              style={{
                transition: `d ${cooldown}ms linear`,
              }}
            />
          </svg>
        </div>
      )}

      {/* Disabled overlay */}
      {disabled && !isOnCooldown && (
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      )}
    </Button>
  )
}
