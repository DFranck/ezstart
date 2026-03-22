'use client'

import { Button, Card, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RoiSelector, type RoiRect } from './roi-selector'

interface CapturePreviewProps {
  isCapturing: boolean
  isAnalyzing: boolean
  isSupported: boolean
  currentFrame: ImageData | null
  error: string | null
  onStart: () => void
  onStop: () => void
  roi?: RoiRect
  onRoiChange?: (roi: RoiRect) => void
}

export function CapturePreview({
  isCapturing,
  isAnalyzing,
  isSupported,
  currentFrame,
  error,
  onStart,
  onStop,
  roi,
  onRoiChange,
}: CapturePreviewProps) {
  const t = useTranslations('scan')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Draw current frame to the visible canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentFrame) return

    if (canvas.width !== currentFrame.width || canvas.height !== currentFrame.height) {
      canvas.width = currentFrame.width
      canvas.height = currentFrame.height
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.putImageData(currentFrame, 0, 0)
  }, [currentFrame])

  // Track container size for ROI selector
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const statusText = useCallback(() => {
    if (error) return error
    if (isAnalyzing) return t('capture.analyzing')
    if (isCapturing) return t('capture.waitingForChange')
    return t('capture.selectWindow')
  }, [error, isAnalyzing, isCapturing, t])

  const statusColor = isAnalyzing
    ? 'text-yellow-500'
    : isCapturing
      ? 'text-green-500'
      : error
        ? 'text-red-500'
        : 'text-muted-foreground'

  if (!isSupported) {
    return (
      <Card className="p-6 text-center">
        <P className="text-muted-foreground">{t('capture.notSupported')}</P>
      </Card>
    )
  }

  return (
    <Div className="space-y-4">
      {/* Preview */}
      <Card className="bg-muted">
        {isCapturing && currentFrame ? (
          <div ref={containerRef} className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
            />
            {onRoiChange && (
              <RoiSelector
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                onChange={onRoiChange}
                initialRoi={roi}
              />
            )}
          </div>
        ) : (
          <Div className="aspect-video flex items-center justify-center">
            <P className="text-muted-foreground text-sm">{t('capture.selectWindow')}</P>
          </Div>
        )}
      </Card>

      {/* ROI hint */}
      {isCapturing && currentFrame && (
        <P className="text-xs text-muted-foreground">{t('capture.adjustZone')}</P>
      )}

      {/* Status */}
      <Div className="flex items-center gap-2">
        {isCapturing && (
          <Div
            className={`h-2 w-2 rounded-full ${isAnalyzing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}
          />
        )}
        <P className={`text-sm ${statusColor}`}>{statusText()}</P>
      </Div>

      {/* Controls */}
      <Button
        className="w-full"
        variant={isCapturing ? 'destructive' : 'default'}
        onClick={isCapturing ? onStop : onStart}
      >
        {isCapturing ? t('capture.stop') : t('capture.start')}
      </Button>
    </Div>
  )
}
