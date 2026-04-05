'use client'

import { Button, Div, Icon, KnownIconName, Span } from '@ezstart/ui/components'
import { ReactNode, useState } from 'react'

type DeviceSize = 'mobile' | 'tablet' | 'desktop'

type ResponsivePreviewProps = {
  children: ReactNode
  className?: string
}

const DEVICE_WIDTHS: Record<DeviceSize, string> = {
  mobile: 'max-w-[375px]',
  tablet: 'max-w-[768px]',
  desktop: 'max-w-full',
}

const DEVICE_ICONS: Record<DeviceSize, KnownIconName> = {
  mobile: 'lucide:Smartphone',
  tablet: 'lucide:Tablet',
  desktop: 'lucide:Monitor',
}

export function ResponsivePreview({ children, className }: ResponsivePreviewProps) {
  const [device, setDevice] = useState<DeviceSize>('desktop')

  return (
    <Div className={className}>
      {/* Device Selector */}
      <Div className="flex gap-2 mb-4 justify-center">
        {(Object.keys(DEVICE_WIDTHS) as DeviceSize[]).map(size => (
          <Button
            key={size}
            variant={device === size ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDevice(size)}
            aria-label={`Preview in ${size} size`}
            aria-pressed={device === size}
          >
            <Icon name={DEVICE_ICONS[size]} size={16} ariaHidden />
            <Span className="ml-2 capitalize">{size}</Span>
          </Button>
        ))}
      </Div>

      {/* Preview Container */}
      <Div
        className={`mx-auto transition-all duration-300 ${DEVICE_WIDTHS[device]}`}
        variant="outline"
        size="default"
      >
        {children}
      </Div>
    </Div>
  )
}
