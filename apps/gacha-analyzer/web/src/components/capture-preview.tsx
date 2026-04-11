'use client'

import { Div, P, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoiRect, MaskRect } from '@ezstart/capture-sdk'
import type { ZoneConfig } from './multi-zone-selector'
import { ZoomCanvas } from './capture/zoom-canvas'
import { FullCanvas } from './capture/full-canvas'
import { CaptureControls, EmptyPreview, NotSupportedMessage } from './capture/controls'

const PREVIEW_HEIGHT_KEY = 'gacha-analyzer-preview-height'
const DEFAULT_PREVIEW_HEIGHT = 400

function loadPreviewHeight(): number {
  if (typeof window === 'undefined') return DEFAULT_PREVIEW_HEIGHT
  try {
    const saved = localStorage.getItem(PREVIEW_HEIGHT_KEY)
    if (saved) return Math.max(150, Math.min(1200, Number(saved)))
  } catch {}
  return DEFAULT_PREVIEW_HEIGHT
}

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
  /** Display mode: 'zoom' = cropped ROI, 'full' = full window + ROI overlay, 'both' = tabs with both views */
  mode?: 'zoom' | 'full' | 'both'
  /** @deprecated Use mode instead */
  showTabs?: boolean
  /** When true, zones/masks/ROI are visible but not interactive */
  zonesLocked?: boolean
  /** Background color for mask rectangles (default: red) */
  maskColor?: string
  /** When true, scroll zoom and zoom buttons are disabled */
  disableZoom?: boolean
  /** When true, shows a compact mini-preview (120px height, no zoom buttons, no resize handle) */
  compact?: boolean
  /** Extra buttons rendered next to the start button */
  extraButtons?: React.ReactNode
}

const MIN_ZOOM = 5
const MAX_ZOOM = 100

const MIN_VP_SIZE = 10
const MAX_VP_SIZE = 100

interface ViewPort {
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_VIEWPORT: ViewPort = { x: 0, y: 0, width: 100, height: 100 }

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
  mode: modeProp,
  showTabs = false,
  zonesLocked = false,
  maskColor,
  disableZoom = false,
  compact = false,
  extraButtons,
}: CapturePreviewProps) {
  // Resolve mode: explicit prop takes priority, fallback to showTabs compat
  const mode = modeProp ?? (showTabs ? 'both' : 'zoom')

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

  const COMPACT_HEIGHT = 120
  const [activeTab, setActiveTab] = useState<string>('zoom')
  const [previewHeight, setPreviewHeight] = useState<number>(loadPreviewHeight)
  const effectiveHeight = compact ? COMPACT_HEIGHT : previewHeight
  const [viewPort, setViewPort] = useState<ViewPort>(DEFAULT_VIEWPORT)
  const viewPortRef = useRef<ViewPort>(DEFAULT_VIEWPORT)
  const isFullPanningRef = useRef(false)
  const isResizingRef = useRef(false)
  const resizeStartYRef = useRef(0)
  const resizeStartHeightRef = useRef(0)

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
    if (mode === 'full') return
    const canvas = canvasRef.current
    if (!canvas || !currentFrame) return

    const srcCanvas = ensureSrcCanvas(currentFrame)

    const r = roiRef.current
    const sx = (r.x / 100) * currentFrame.width
    const sy = (r.y / 100) * currentFrame.height
    const sw = (r.width / 100) * currentFrame.width
    const sh = (r.height / 100) * currentFrame.height

    const container = containerRef.current
    if (!container) return
    const containerWidth = container.clientWidth

    if (canvas.width !== containerWidth || canvas.height !== effectiveHeight) {
      canvas.width = containerWidth
      canvas.height = effectiveHeight
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  }, [currentFrame, roi, effectiveHeight, ensureSrcCanvas, mode])

  // Draw the full frame to the full preview canvas
  useEffect(() => {
    if (mode === 'zoom') return
    const canvas = fullCanvasRef.current
    if (!canvas || !currentFrame) return

    const srcCanvas = ensureSrcCanvas(currentFrame)

    const container = fullContainerRef.current
    if (!container) return
    const containerWidth = container.clientWidth

    if (canvas.width !== containerWidth || canvas.height !== effectiveHeight) {
      canvas.width = containerWidth
      canvas.height = effectiveHeight
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height)
  }, [currentFrame, mode, effectiveHeight, ensureSrcCanvas, activeTab])

  // Wheel handler for zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasVisible || disableZoom || mode === 'full') return

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return
      e.preventDefault()
      const cb = onRoiChangeRef.current
      if (!cb) return

      const r = roiRef.current
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9

      const newWidth = clamp(r.width * zoomFactor, MIN_ZOOM, MAX_ZOOM)
      const newHeight = clamp(r.height * zoomFactor, MIN_ZOOM, MAX_ZOOM)

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
  }, [canvasVisible, disableZoom, mode])

  // Drag handlers for pan (zoom canvas only)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasVisible || mode === 'full') return

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
  }, [canvasVisible, mode])

  // Full-view viewport zoom (Ctrl+scroll)
  useEffect(() => {
    const container = fullContainerRef.current
    if (!container || !canvasVisible || disableZoom) return
    if (mode === 'zoom') return
    if (mode === 'both' && activeTab !== 'full') return

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return
      e.preventDefault()

      const vp = viewPortRef.current
      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87

      const newWidth = clamp(vp.width * zoomFactor, MIN_VP_SIZE, MAX_VP_SIZE)
      const newHeight = clamp(vp.height * zoomFactor, MIN_VP_SIZE, MAX_VP_SIZE)

      const rect = container!.getBoundingClientRect()
      const mouseXRatio = (e.clientX - rect.left) / rect.width
      const mouseYRatio = (e.clientY - rect.top) / rect.height

      const pointX = vp.x + mouseXRatio * vp.width
      const pointY = vp.y + mouseYRatio * vp.height

      const newX = clamp(pointX - mouseXRatio * newWidth, 0, 100 - newWidth)
      const newY = clamp(pointY - mouseYRatio * newHeight, 0, 100 - newHeight)

      const newVP = { x: newX, y: newY, width: newWidth, height: newHeight }
      viewPortRef.current = newVP
      setViewPort(newVP)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [canvasVisible, disableZoom, mode, activeTab])

  // Full-view viewport pan
  useEffect(() => {
    const container = fullContainerRef.current
    if (!container || !canvasVisible) return
    if (mode === 'zoom') return
    if (mode === 'both' && activeTab !== 'full') return

    function handleMouseDown(e: MouseEvent) {
      if (e.button === 1) {
        e.preventDefault()
        isFullPanningRef.current = true
        container!.style.cursor = 'grabbing'
        return
      }
      if (e.button === 0) {
        const target = e.target as HTMLElement
        if (target.tagName === 'CANVAS' || target === container) {
          e.preventDefault()
          isFullPanningRef.current = true
          container!.style.cursor = 'grabbing'
        }
      }
    }

    function handleAuxClick(e: MouseEvent) {
      if (e.button === 1) e.preventDefault()
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isFullPanningRef.current) return
      const vp = viewPortRef.current
      if (vp.width >= 100 && vp.height >= 100) return

      const rect = container!.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dx = (e.movementX / rect.width) * vp.width
      const dy = (e.movementY / rect.height) * vp.height

      const newVP = {
        ...vp,
        x: clamp(vp.x - dx, 0, 100 - vp.width),
        y: clamp(vp.y - dy, 0, 100 - vp.height),
      }
      viewPortRef.current = newVP
      setViewPort(newVP)
    }

    function handleMouseUp() {
      if (isFullPanningRef.current) {
        isFullPanningRef.current = false
        container!.style.cursor = viewPortRef.current.width < 100 ? 'grab' : ''
      }
    }

    let lastTouchX = 0
    let lastTouchY = 0

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        isFullPanningRef.current = true
        const midX = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2
        const midY = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2
        lastTouchX = midX
        lastTouchY = midY
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isFullPanningRef.current || e.touches.length !== 2) return
      e.preventDefault()

      const vp = viewPortRef.current
      if (vp.width >= 100 && vp.height >= 100) return

      const midX = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2
      const midY = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2
      const movementX = midX - lastTouchX
      const movementY = midY - lastTouchY
      lastTouchX = midX
      lastTouchY = midY

      const rect = container!.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dx = (movementX / rect.width) * vp.width
      const dy = (movementY / rect.height) * vp.height

      const newVP = {
        ...vp,
        x: clamp(vp.x - dx, 0, 100 - vp.width),
        y: clamp(vp.y - dy, 0, 100 - vp.height),
      }
      viewPortRef.current = newVP
      setViewPort(newVP)
    }

    function handleTouchEnd() {
      isFullPanningRef.current = false
    }

    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('auxclick', handleAuxClick)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('touchstart', handleTouchStart)
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('auxclick', handleAuxClick)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [canvasVisible, mode, activeTab])

  // Full-view zoom buttons
  const handleFullZoomIn = useCallback(() => {
    if (disableZoom) return
    const vp = viewPortRef.current
    const factor = 0.8
    const newWidth = clamp(vp.width * factor, MIN_VP_SIZE, MAX_VP_SIZE)
    const newHeight = clamp(vp.height * factor, MIN_VP_SIZE, MAX_VP_SIZE)
    const centerX = vp.x + vp.width / 2
    const centerY = vp.y + vp.height / 2
    const newVP = {
      x: clamp(centerX - newWidth / 2, 0, 100 - newWidth),
      y: clamp(centerY - newHeight / 2, 0, 100 - newHeight),
      width: newWidth,
      height: newHeight,
    }
    viewPortRef.current = newVP
    setViewPort(newVP)
  }, [disableZoom])

  const handleFullZoomOut = useCallback(() => {
    if (disableZoom) return
    const vp = viewPortRef.current
    const factor = 1.25
    const newWidth = clamp(vp.width * factor, MIN_VP_SIZE, MAX_VP_SIZE)
    const newHeight = clamp(vp.height * factor, MIN_VP_SIZE, MAX_VP_SIZE)
    const centerX = vp.x + vp.width / 2
    const centerY = vp.y + vp.height / 2
    const newVP = {
      x: clamp(centerX - newWidth / 2, 0, 100 - newWidth),
      y: clamp(centerY - newHeight / 2, 0, 100 - newHeight),
      width: newWidth,
      height: newHeight,
    }
    viewPortRef.current = newVP
    setViewPort(newVP)
  }, [disableZoom])

  const handleFullZoomReset = useCallback(() => {
    viewPortRef.current = DEFAULT_VIEWPORT
    setViewPort(DEFAULT_VIEWPORT)
  }, [])

  // Preview resize handlers
  const startPreviewResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isResizingRef.current = true
      resizeStartYRef.current = e.clientY
      resizeStartHeightRef.current = previewHeight

      function handleMouseMove(ev: MouseEvent) {
        if (!isResizingRef.current) return
        const delta = ev.clientY - resizeStartYRef.current
        const newHeight = Math.max(150, Math.min(1200, resizeStartHeightRef.current + delta))
        setPreviewHeight(newHeight)
      }

      function handleMouseUp() {
        if (!isResizingRef.current) return
        isResizingRef.current = false
        setPreviewHeight(prev => {
          localStorage.setItem(PREVIEW_HEIGHT_KEY, String(prev))
          return prev
        })
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [previewHeight]
  )

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

  // Compute zoom percentage
  const zoomPercent = roi ? Math.round(roi.width) : 100
  const fullZoomPercent = Math.round((100 / viewPort.width) * 100)
  const isFullZoomed = viewPort.width < 100

  if (!isSupported) {
    return <NotSupportedMessage />
  }

  return (
    <Div className="space-y-4">
      {/* Previews */}
      {isCapturing && currentFrame ? (
        mode === 'both' ? (
          <Tabs defaultValue="zoom" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="zoom">{t('capture.zoomView')}</TabsTrigger>
              <TabsTrigger value="full">{t('capture.fullView')}</TabsTrigger>
            </TabsList>
            <TabsContent value="zoom">
              <ZoomCanvas
                containerRef={containerRef}
                canvasRef={canvasRef}
                effectiveHeight={effectiveHeight}
                zones={zones}
                onZonesChange={onZonesChange}
                masks={masks}
                onMasksChange={onMasksChange}
                onMaskAdd={onMaskAdd}
                onMaskRemove={onMaskRemove}
                zonesLocked={zonesLocked}
                maskColor={maskColor}
                disableZoom={disableZoom}
                compact={compact}
                zoomPercent={zoomPercent}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onStartResize={startPreviewResize}
              />
            </TabsContent>
            <TabsContent value="full">
              <FullCanvas
                fullContainerRef={fullContainerRef}
                fullCanvasRef={fullCanvasRef}
                effectiveHeight={effectiveHeight}
                viewPort={viewPort}
                roi={roi}
                onRoiChange={onRoiChange}
                zones={zones}
                onZonesChange={onZonesChange}
                masks={masks}
                onMasksChange={onMasksChange}
                onMaskAdd={onMaskAdd}
                onMaskRemove={onMaskRemove}
                zonesLocked={zonesLocked}
                maskColor={maskColor}
                disableZoom={disableZoom}
                compact={compact}
                fullZoomPercent={fullZoomPercent}
                isFullZoomed={isFullZoomed}
                onFullZoomIn={handleFullZoomIn}
                onFullZoomOut={handleFullZoomOut}
                onFullZoomReset={handleFullZoomReset}
                onStartResize={startPreviewResize}
              />
            </TabsContent>
          </Tabs>
        ) : mode === 'full' ? (
          <FullCanvas
            fullContainerRef={fullContainerRef}
            fullCanvasRef={fullCanvasRef}
            effectiveHeight={effectiveHeight}
            viewPort={viewPort}
            roi={roi}
            onRoiChange={onRoiChange}
            zones={zones}
            onZonesChange={onZonesChange}
            masks={masks}
            onMasksChange={onMasksChange}
            onMaskAdd={onMaskAdd}
            onMaskRemove={onMaskRemove}
            zonesLocked={zonesLocked}
            maskColor={maskColor}
            disableZoom={disableZoom}
            compact={compact}
            fullZoomPercent={fullZoomPercent}
            isFullZoomed={isFullZoomed}
            onFullZoomIn={handleFullZoomIn}
            onFullZoomOut={handleFullZoomOut}
            onFullZoomReset={handleFullZoomReset}
            onStartResize={startPreviewResize}
          />
        ) : (
          <ZoomCanvas
            containerRef={containerRef}
            canvasRef={canvasRef}
            effectiveHeight={effectiveHeight}
            zones={zones}
            onZonesChange={onZonesChange}
            masks={masks}
            onMasksChange={onMasksChange}
            onMaskAdd={onMaskAdd}
            onMaskRemove={onMaskRemove}
            zonesLocked={zonesLocked}
            maskColor={maskColor}
            disableZoom={disableZoom}
            compact={compact}
            zoomPercent={zoomPercent}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onStartResize={startPreviewResize}
          />
        )
      ) : (
        <EmptyPreview />
      )}

      {/* Navigation hint */}
      {!compact && isCapturing && currentFrame && (mode !== 'full' || isFullZoomed) && (
        <P className="text-xs text-muted-foreground">
          {mode === 'full' || (mode === 'both' && activeTab === 'full')
            ? disableZoom
              ? t('capture.fullPanHintOnly')
              : t('capture.fullPanHint')
            : disableZoom
              ? t('capture.dragToNavigateOnly')
              : t('capture.dragToNavigate')}
        </P>
      )}

      {/* Status + Controls */}
      <CaptureControls
        isCapturing={isCapturing}
        isAnalyzing={isAnalyzing}
        error={error}
        onStart={onStart}
        onStop={onStop}
        extraButtons={extraButtons}
      />
    </Div>
  )
}
