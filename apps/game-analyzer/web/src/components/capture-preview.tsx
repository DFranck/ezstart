'use client'

import { Button, Card, Div, P, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoiRect } from './roi-selector'
import { RoiSelector } from './roi-selector'
import type { ZoneConfig } from './multi-zone-selector'
import { MultiZoneSelector } from './multi-zone-selector'
import type { MaskRect } from './blackout-mask'
import { BlackoutMask } from './blackout-mask'

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
  zones?: ZoneConfig[]
  onZonesChange?: (zones: ZoneConfig[]) => void
  masks?: MaskRect[]
  onMasksChange?: (masks: MaskRect[]) => void
  onMaskAdd?: () => void
  onMaskRemove?: (id: string) => void
  showTabs?: boolean
  /** When true, zones and masks are visible but not interactive */
  zonesLocked?: boolean
  /** Background color for mask rectangles (default: red) */
  maskColor?: string
  /** When true, scroll zoom and zoom buttons are disabled */
  disableZoom?: boolean
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
  zones,
  onZonesChange,
  masks,
  onMasksChange,
  onMaskAdd,
  onMaskRemove,
  showTabs = false,
  zonesLocked = false,
  maskColor,
  disableZoom = false,
}: CapturePreviewProps) {
  const t = useTranslations('scan')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fullCanvasRef = useRef<HTMLCanvasElement>(null)
  const srcCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fullContainerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const roiRef = useRef<RoiRect>(roi ?? { x: 60, y: 5, width: 35, height: 40 })
  const onRoiChangeRef = useRef(onRoiChange)
  onRoiChangeRef.current = onRoiChange

  const [activeTab, setActiveTab] = useState<string>('zoom')

  // Track whether the canvas is visible (mounted in DOM)
  const canvasVisible = isCapturing && !!currentFrame

  // Keep roiRef in sync with prop
  useEffect(() => {
    if (roi) roiRef.current = roi
  }, [roi])

  // Maintain an offscreen source canvas with the full frame
  const ensureSrcCanvas = useCallback((frame: ImageData) => {
    if (!srcCanvasRef.current) {
      srcCanvasRef.current = document.createElement('canvas')
    }
    const srcCanvas = srcCanvasRef.current
    if (srcCanvas.width !== frame.width || srcCanvas.height !== frame.height) {
      srcCanvas.width = frame.width
      srcCanvas.height = frame.height
    }
    const srcCtx = srcCanvas.getContext('2d')
    if (srcCtx) srcCtx.putImageData(frame, 0, 0)
    return srcCanvas
  }, [])

  // Draw the cropped ROI zone to the zoom canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentFrame) return

    const srcCanvas = ensureSrcCanvas(currentFrame)

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
  }, [currentFrame, roi, ensureSrcCanvas])

  // Draw the full frame to the full preview canvas
  useEffect(() => {
    if (!showTabs) return
    const canvas = fullCanvasRef.current
    if (!canvas || !currentFrame) return

    const srcCanvas = ensureSrcCanvas(currentFrame)

    const container = fullContainerRef.current
    if (!container) return
    const containerWidth = container.clientWidth
    const aspectRatio = currentFrame.height > 0 ? currentFrame.width / currentFrame.height : 16 / 9
    const containerHeight = Math.round(containerWidth / aspectRatio)

    if (canvas.width !== containerWidth || canvas.height !== containerHeight) {
      canvas.width = containerWidth
      canvas.height = containerHeight
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height)
  }, [currentFrame, showTabs, ensureSrcCanvas, activeTab])

  // Wheel handler for zoom — only with Ctrl held, depends on canvasVisible so it re-registers when canvas appears
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasVisible || disableZoom) return

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return // scroll normal = ignore, Ctrl+scroll = zoom
      e.preventDefault()
      const cb = onRoiChangeRef.current
      if (!cb) return

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
      cb(newRoi)
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [canvasVisible, disableZoom])

  // Drag handlers for pan — depends on canvasVisible so it re-registers when canvas appears
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasVisible) return

    function handleMouseDown(e: MouseEvent) {
      e.preventDefault()
      isDraggingRef.current = true
      canvas!.style.cursor = 'grabbing'
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return
      const cb = onRoiChangeRef.current
      if (!cb) return
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
      cb(newRoi)
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

      const cb = onRoiChangeRef.current
      if (!cb) return
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
      cb(newRoi)
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
  }, [canvasVisible])

  // Zoom button handlers
  const handleZoomIn = useCallback(() => {
    if (!onRoiChange || disableZoom) return
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
  }, [onRoiChange, disableZoom])

  const handleZoomOut = useCallback(() => {
    if (!onRoiChange || disableZoom) return
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
  }, [onRoiChange, disableZoom])

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

  // Zoom canvas with overlays (shared between both views)
  const zoomCanvas = (
    <Card className="bg-muted">
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ cursor: 'grab', touchAction: 'none' }}
        />
        {/* Multi-zone overlay on zoom view */}
        {zones && onZonesChange && (
          <MultiZoneSelector
            onChange={onZonesChange}
            initialZones={zones}
            locked={zonesLocked}
          />
        )}
        {/* Blackout mask overlay on zoom view */}
        {masks && onMasksChange && onMaskAdd && onMaskRemove && (
          <BlackoutMask
            masks={masks}
            onChange={onMasksChange}
            onAdd={onMaskAdd}
            onRemove={onMaskRemove}
            locked={zonesLocked}
            maskColor={maskColor}
          />
        )}
        {/* Zoom indicator + buttons — hidden when zoom is disabled */}
        {!disableZoom && (
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
        )}
      </div>
    </Card>
  )

  // Full canvas with ROI selector + zones + masks
  const fullCanvas = (
    <Card className="bg-muted">
      <div ref={fullContainerRef} className="relative">
        <canvas
          ref={fullCanvasRef}
          className="w-full h-auto block"
        />
        {roi && onRoiChange && (
          <RoiSelector
            onChange={onRoiChange}
            initialRoi={roi}
          />
        )}
        {/* Multi-zone overlay on full view — positions are relative to the ROI */}
        {zones && onZonesChange && roi && (
          <MultiZoneSelector
            onChange={onZonesChange}
            initialZones={zones}
            parentRoi={roi}
            locked={zonesLocked}
          />
        )}
        {/* Blackout mask overlay on full view — positions are relative to the ROI */}
        {masks && onMasksChange && onMaskAdd && onMaskRemove && roi && (
          <BlackoutMask
            masks={masks}
            onChange={onMasksChange}
            onAdd={onMaskAdd}
            onRemove={onMaskRemove}
            parentRoi={roi}
            locked={zonesLocked}
            maskColor={maskColor}
          />
        )}
      </div>
    </Card>
  )

  return (
    <Div className="space-y-4">
      {/* Previews */}
      {isCapturing && currentFrame ? (
        showTabs ? (
          <Tabs defaultValue="zoom" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="zoom">{t('capture.zoomView')}</TabsTrigger>
              <TabsTrigger value="full">{t('capture.fullView')}</TabsTrigger>
            </TabsList>
            <TabsContent value="zoom">
              {zoomCanvas}
            </TabsContent>
            <TabsContent value="full">
              {fullCanvas}
            </TabsContent>
          </Tabs>
        ) : (
          zoomCanvas
        )
      ) : (
        <Card className="bg-muted border-dashed border-2 border-border">
          <Div className="aspect-video flex flex-col items-center justify-center gap-3 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
            <P className="text-muted-foreground text-sm text-center">{t('capture.selectWindow')}</P>
          </Div>
        </Card>
      )}

      {/* Navigation hint */}
      {isCapturing && currentFrame && (
        <P className="text-xs text-muted-foreground">
          {disableZoom ? t('capture.dragToNavigateOnly') : t('capture.dragToNavigate')}
        </P>
      )}

      {/* Status + Controls */}
      {isCapturing ? (
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-2">
            <Div
              className={`h-2 w-2 rounded-full ${isAnalyzing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}
            />
            <P className={`text-sm ${statusColor}`}>{statusText()}</P>
          </Div>
          <Button
            size="sm"
            variant="outline"
            onClick={onStop}
            className="text-xs"
          >
            {t('capture.stop')}
          </Button>
        </Div>
      ) : (
        <>
          {error && (
            <P className={`text-sm ${statusColor}`}>{statusText()}</P>
          )}
          <Button
            className="w-full h-12 text-base font-semibold"
            variant="default"
            onClick={onStart}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
            {t('capture.start')}
          </Button>
        </>
      )}
    </Div>
  )
}
