'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

// Import depuis UI (composants agnostics)
import { Button, Icon } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleTheme = () => {
    setIsAnimating(true)
    setTheme(theme === 'light' ? 'dark' : 'light')
    setTimeout(() => setIsAnimating(false), 100)
  }

  // Use resolvedTheme for immediate rendering, fallback to 'light' during SSR
  const currentTheme = isMounted ? resolvedTheme : 'light'
  const isDark = currentTheme === 'dark'

  return (
    <Button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      variant="ghost"
      className={cn('cursor-pointer overflow-hidden', className)}
      size={'sm'}
    >
      <div
        className="relative w-4 h-4"
        style={{
          transform: isAnimating ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Icon
          name="lucide:Sun"
          className="absolute inset-0 w-4 h-4"
          style={{
            opacity: isDark ? 0 : 1,
            transform: isDark ? 'scale(0)' : 'scale(1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <Icon
          name="lucide:Moon"
          className="absolute inset-0 w-4 h-4"
          style={{
            opacity: isDark ? 1 : 0,
            transform: isDark ? 'scale(1)' : 'scale(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </Button>
  )
}
