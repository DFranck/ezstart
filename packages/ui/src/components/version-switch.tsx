'use client'

import * as React from 'react'
import { Switch, Label } from '@ezstart/ui/components'

export interface VersionSwitchProps {
  /**
   * Label for version 1 (default/current)
   */
  v1Label?: string

  /**
   * Label for version 2 (new)
   */
  v2Label?: string

  /**
   * Path suffix for v2 (default: '/v2')
   */
  v2Suffix?: string

  /**
   * Position on screen
   */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

  /**
   * Size variant
   */
  size?: 'sm' | 'default' | 'lg'
}

export function VersionSwitch({
  v1Label = 'Current',
  v2Label = 'New Version',
  v2Suffix = '/v2',
  position = 'bottom-left',
  size = 'default',
}: VersionSwitchProps) {
  const [pathname, setPathname] = React.useState('')
  const [isV2, setIsV2] = React.useState(false)

  // Get current pathname from window (client-side only)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      setPathname(currentPath)
      setIsV2(currentPath.endsWith(v2Suffix))
    }
  }, [v2Suffix])

  const handleToggle = (checked: boolean) => {
    if (typeof window === 'undefined') return

    // Get base path (remove v2 suffix if present)
    const basePath = pathname.endsWith(v2Suffix)
      ? pathname.slice(0, -v2Suffix.length)
      : pathname

    if (checked) {
      // Switch to v2 - add suffix
      window.location.href = `${basePath}${v2Suffix}`
    } else {
      // Switch to v1 - remove suffix
      window.location.href = basePath
    }
  }

  // Position classes
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg`}
    >
      <Label htmlFor="version-switch" className="text-sm font-medium cursor-pointer select-none">
        {isV2 ? v2Label : v1Label}
      </Label>
      <Switch
        id="version-switch"
        checked={isV2}
        onCheckedChange={handleToggle}
        size={size}
        aria-label={`Switch to ${isV2 ? v1Label : v2Label}`}
      />
    </div>
  )
}
