'use client'

import { Button, Card, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoiRect } from './roi-selector'

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

const MIN_ZOOM = 5   // minimum ROI size = 5% of source
const MAX_ZOOM = 100  // maximum ROI size = 100% of source

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
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
  const srcCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const roiRef = useRef<RoiRect>(roi ?? { x: 60, y: 5, width: 35, height: 40 })

  // Keep roiRef in sync with prop
  useEffect(() => {
    if (roi) roiRef.current = roi
  }, [roi])

  // Draw the cropped ROI zone to the visible canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentFrame) return

    // Maintain an offscreen source canvas with the full frame
    if (!srcCanvasRef.current) {
      srcCanvasRef.current = document.createElement('canvas')
    }
    const srcCanvas = srcCanvasRef.current
    if (srcCanvas.width !== currentFrame.width || srcCanvas.height !== currentFrame.height) {
      srcCanvas.width = currentFrame.width
      srcCanvas.height = currentFrame.height
    }
    const srcCtx = srcCanvas.getContext('2d')
    if (!srcCtx) return
    srcCtx.putImageData(currentFrame, 0, 0)

    // Compute source crop from ROI percentages
    const r = roiRef.current
    const sx = (r.x / 100) * currentFrame.width
    const sy = (r.y / 100) * currentFrame.height
    const sw = (r.width / 100) * currentFrame.width
    const sh = (r.height / 100) * currentFrame.height

    // Size preview canvas to container
    const container = containerRef.current
    if (!container) return
    const containerWidth = container.clientWidth
    const aspectRatio = sh > 0 ? sw / sh : 16 / 9
    const containerHeight = Math.round(containerWidth / aspectRatio)

    if (canvas.width !== containerWidth || canvas.height !== containerHeight) {
      canvas.width = containerWidth
      canvas.height = containerHeight
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  }, [currentFrame, roi])

  // Wheel handler for zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      if (!onRoiChange) return

      const r = roiRef.current
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9

      const newWidth = clamp(r.width * zoomFactor, MIN_ZOOM, MAX_ZOOM)
      const newHeight = clamp(r.height * zoomFactor, MIN_ZOOM, MAX_ZOOM)

      // Keep center fixed
      const centerX = r.x + r.width / 2
      const centerY = r.y + r.height / 2
      const newX = clamp(centerX - newWidth / 2, 0, 100 - newWidth)
      const newY = clamp(centerY - newHeight / 2, 0, 100 - newHeight)

      const newRoi = { x: newX, y: newY, width: newWidth, height: newHeight }
      roiRef.current = newRoi
      onRoiChange(newRoi)
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [onRoiChange])

  // Drag handlers for pan
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !onRoiChange) return

    function handleMouseDown(e: MouseEvent) {
      e.preventDefault()
      isDraggingRef.current = true
      canvas!.style.cursor = 'grabbing'
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return
      const r = roiRef.current
      const canvasWidth = canvas!.clientWidth
      const canvasHeight = canvas!.clientHeight
      if (canvasWidth === 0 || canvasHeight === 0) return

      // Convert pixel movement to percentage of source image
      const dx = (e.movementX / canvasWidth) * r.width
      const dy = (e.movementY / canvasHeight) * r.height

      const newRoi = {
        ...r,
        x: clamp(r.x - dx, 0, 100 - r.width),
        y: clamp(r.y - dy, 0, 100 - r.height),
      }
      roiRef.current = newRoi
      onRoiChange!(newRoi)
    }

    function handleMouseUp() {
      isDraggingRef.current = false
      canvas!.style.cursor = 'grab'
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    // Touch support
    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        isDraggingRef.current = true
      }
    }

    let lastTouchX = 0
    let lastTouchY = 0

    function handleTouchStartCapture(e: TouchEvent) {
      const first = e.touches[0]
      if (e.touches.length === 1 && first) {
        lastTouchX = first.clientX
        lastTouchY = first.clientY
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current || e.touches.length !== 1) return
      e.preventDefault()

      const touch = e.touches[0]
      if (!touch) return
      const movementX = touch.clientX - lastTouchX
      const movementY = touch.clientY - lastTouchY
      lastTouchX = touch.clientX
      lastTouchY = touch.clientY

      const r = roiRef.current
      const canvasWidth = canvas!.clientWidth
      const canvasHeight = canvas!.clientHeight
      if (canvasWidth === 0 || canvasHeight === 0) return

      const dx = (movementX / canvasWidth) * r.width
      const dy = (movementY / canvasHeight) * r.height

      const newRoi = {
        ...r,
        x: clamp(r.x - dx, 0, 100 - r.width),
        y: clamp(r.y - dy, 0, 100 - r.height),
      }
      roiRef.current = newRoi
      onRoiChange!(newRoi)
    }

    function handleTouchEnd() {
      isDraggingRef.current = false
    }

    canvas.addEventListener('touchstart', handleTouchStart)
    canvas.addEventListener('touchstart', handleTouchStartCapture)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchstart', handleTouchStartCapture)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRoiChange])

  // Zoom button handlers
  const handleZoomIn = useCallback(() => {
    if (!onRoiChange) return
    const r = roiRef.current
    const factor = 0.85
    const newWidth = clamp(r.width * factor, MIN_ZOOM, MAX_ZOOM)
    const newHeight = clamp(r.height * factor, MIN_ZOOM, MAX_ZOOM)
    const centerX = r.x + r.width / 2
    const centerY = r.y + r.height / 2
    const newRoi = {
      x: clamp(centerX - newWidth / 2, 0, 100 - newWidth),
      y: clamp(centerY - newHeight / 2, 0, 100 - newHeight),
      width: newWidth,
      height: newHeight,
    }
    roiRef.current = newRoi
    onRoiChange(newRoi)
  }, [onRoiChange])

  const handleZoomOut = useCallback(() => {
    if (!onRoiChange) return
    const r = roiRef.current
    const factor = 1.18
    const newWidth = clamp(r.width * factor, MIN_ZOOM, MAX_ZOOM)
    const newHeight = clamp(r.height * factor, MIN_ZOOM, MAX_ZOOM)
    const centerX = r.x + r.width / 2
    const centerY = r.y + r.height / 2
    const newRoi = {
      x: clamp(centerX - newWidth / 2, 0, 100 - newWidth),
      y: clamp(centerY - newHeight / 2, 0, 100 - newHeight),
      width: newWidth,
      height: newHeight,
    }
    roiRef.current = newRoi
    onRoiChange(newRoi)
  }, [onRoiChange])

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

  // Compute zoom percentage (100% = full window, smaller = more zoomed in)
  const zoomPercent = roi ? Math.round(roi.width) : 100

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
              style={{ cursor: 'grab' }}
            />
            {/* Zoom indicator + buttons */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded-md px-2 py-1">
              <button
                type="button"
                onClick={handleZoomOut}
                className="text-white text-xs font-bold px-1.5 py-0.5 hover:bg-white/20 rounded"
                title={t('capture.zoomOut')}
              >
                -
              </button>
              <span className="text-white text-xs font-mono min-w-[3rem] text-center">
                {t('capture.zoom')}: {zoomPercent}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="text-white text-xs font-bold px-1.5 py-0.5 hover:bg-white/20 rounded"
                title={t('capture.zoomIn')}
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <Div className="aspect-video flex items-center justify-center">
            <P className="text-muted-foreground text-sm">{t('capture.selectWindow')}</P>
          </Div>
        )}
      </Card>

      {/* Navigation hint */}
      {isCapturing && currentFrame && (
        <P className="text-xs text-muted-foreground">{t('capture.dragToNavigate')}</P>
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
