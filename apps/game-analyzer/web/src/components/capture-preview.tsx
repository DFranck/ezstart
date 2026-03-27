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

const PREVIEW_HEIGHT_KEY = 'game-analyzer-preview-height'
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

const MIN_ZOOM = 5   // minimum ROI size = 5% of source
const MAX_ZOOM = 100  // maximum ROI size = 100% of source

const MIN_VP_SIZE = 10  // minimum viewport size = 10% (zoom 10x)
const MAX_VP_SIZE = 100 // maximum viewport size = 100% (no zoom)

interface ViewPort {
  x: number      // % of source window (0-100)
  y: number
  width: number  // % visible (100 = all, 50 = zoom 2x, 25 = zoom 4x)
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

  // Draw the cropped ROI zone to the zoom canvas (only for 'zoom' and 'both' modes)
  useEffect(() => {
    if (mode === 'full') return
    const canvas = canvasRef.current
    if (!canvas || !currentFrame) return

    const srcCanvas = ensureSrcCanvas(currentFrame)

    // Compute source crop from ROI percentages
    const r = roiRef.current
    const sx = (r.x / 100) * currentFrame.width
    const sy = (r.y / 100) * currentFrame.height
    const sw = (r.width / 100) * currentFrame.width
    const sh = (r.height / 100) * currentFrame.height

    // Size preview canvas to container width, user-defined height
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

  // Draw the full frame to the full preview canvas (for 'full' and 'both' modes)
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

  // Wheel handler for zoom — only with Ctrl held, depends on canvasVisible so it re-registers when canvas appears
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasVisible || disableZoom || mode === 'full') return

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
  }, [canvasVisible, disableZoom, mode])

  // Drag handlers for pan — depends on canvasVisible so it re-registers when canvas appears (zoom canvas only)
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
  }, [canvasVisible, mode])

  // Full-view viewport zoom (Ctrl+scroll)
  useEffect(() => {
    const container = fullContainerRef.current
    if (!container || !canvasVisible || disableZoom) return
    // Only enable when full view is active
    if (mode === 'zoom') return
    if (mode === 'both' && activeTab !== 'full') return

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return
      e.preventDefault()

      const vp = viewPortRef.current
      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87

      const newWidth = clamp(vp.width * zoomFactor, MIN_VP_SIZE, MAX_VP_SIZE)
      const newHeight = clamp(vp.height * zoomFactor, MIN_VP_SIZE, MAX_VP_SIZE)

      // Zoom towards mouse position
      const rect = container!.getBoundingClientRect()
      const mouseXRatio = (e.clientX - rect.left) / rect.width
      const mouseYRatio = (e.clientY - rect.top) / rect.height

      // The point under the mouse in source %
      const pointX = vp.x + mouseXRatio * vp.width
      const pointY = vp.y + mouseYRatio * vp.height

      // Keep that point under the mouse after zoom
      const newX = clamp(pointX - mouseXRatio * newWidth, 0, 100 - newWidth)
      const newY = clamp(pointY - mouseYRatio * newHeight, 0, 100 - newHeight)

      const newVP = { x: newX, y: newY, width: newWidth, height: newHeight }
      viewPortRef.current = newVP
      setViewPort(newVP)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [canvasVisible, disableZoom, mode, activeTab])

  // Full-view viewport pan — middle click (button 1) OR left click outside overlays
  // Middle click always pans, left click pans only when NOT on an overlay (ROI/zones/masks)
  useEffect(() => {
    const container = fullContainerRef.current
    if (!container || !canvasVisible) return
    if (mode === 'zoom') return
    if (mode === 'both' && activeTab !== 'full') return

    function handleMouseDown(e: MouseEvent) {
      // Middle click (button 1) = always pan
      if (e.button === 1) {
        e.preventDefault()
        isFullPanningRef.current = true
        container!.style.cursor = 'grabbing'
        return
      }
      // Left click (button 0) = pan only if clicking on background (canvas or container)
      if (e.button === 0) {
        const target = e.target as HTMLElement
        if (target.tagName === 'CANVAS' || target === container) {
          e.preventDefault()
          isFullPanningRef.current = true
          container!.style.cursor = 'grabbing'
        }
      }
    }

    // Prevent default context menu on middle click
    function handleAuxClick(e: MouseEvent) {
      if (e.button === 1) e.preventDefault()
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isFullPanningRef.current) return
      const vp = viewPortRef.current
      if (vp.width >= 100 && vp.height >= 100) return // no pan when fully zoomed out

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

    // Touch support for full-view pan — two-finger pan to avoid conflict with ROI drag
    let lastTouchX = 0
    let lastTouchY = 0

    function handleTouchStart(e: TouchEvent) {
      // Two-finger touch = pan (one finger reserved for ROI/zones)
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
  const startPreviewResize = useCallback((e: React.MouseEvent) => {
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
  }, [previewHeight])

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
    ? 'text-warning-foreground'
    : isCapturing
      ? 'text-success-foreground'
      : error
        ? 'text-destructive-foreground'
        : 'text-muted-foreground'

  // Compute zoom percentage (100% = full window, smaller = more zoomed in)
  const zoomPercent = roi ? Math.round(roi.width) : 100
  const fullZoomPercent = Math.round(100 / viewPort.width * 100)
  const isFullZoomed = viewPort.width < 100

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
      <div ref={containerRef} className="relative overflow-hidden" style={{ height: effectiveHeight }}>
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ cursor: 'grab', touchAction: 'none', height: effectiveHeight }}
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
        {/* Zoom indicator + buttons — hidden when zoom is disabled or compact */}
        {!disableZoom && !compact && (
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
        {/* Resize handle — bottom-right corner, hidden in compact mode */}
        {!compact && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50"
            onMouseDown={startPreviewResize}
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)',
              borderRadius: '0 0 8px 0',
            }}
          />
        )}
      </div>
    </Card>
  )

  // CSS transform scale/translate for full-view viewport zoom
  const vpScale = 100 / viewPort.width
  const vpTranslateX = -viewPort.x
  const vpTranslateY = -viewPort.y

  // Full canvas with ROI selector + zones + masks + viewport zoom
  const fullCanvas = (
    <Card className="bg-muted">
      <div
        ref={fullContainerRef}
        className="relative overflow-hidden"
        style={{
          height: effectiveHeight,
          cursor: isFullZoomed ? 'grab' : undefined,
        }}
      >
        {/* Scaled inner container — CSS transform handles the viewport zoom */}
        <div
          style={{
            transform: `scale(${vpScale}) translate(${vpTranslateX}%, ${vpTranslateY}%)`,
            transformOrigin: 'top left',
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <canvas
            ref={fullCanvasRef}
            className="w-full block"
            style={{ height: effectiveHeight, pointerEvents: 'none' }}
          />
          {roi && onRoiChange && (
            <RoiSelector
              onChange={onRoiChange}
              initialRoi={roi}
              locked={zonesLocked}
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
        {/* Zoom controls for full view — hidden in compact mode */}
        {!disableZoom && !compact && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded-md px-2 py-1 z-40">
            <button
              type="button"
              onClick={handleFullZoomOut}
              className="text-white text-xs font-bold px-1.5 py-0.5 hover:bg-white/20 rounded"
              title={t('capture.zoomOut')}
            >
              -
            </button>
            <span className="text-white text-xs font-mono min-w-[3rem] text-center">
              {fullZoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleFullZoomIn}
              className="text-white text-xs font-bold px-1.5 py-0.5 hover:bg-white/20 rounded"
              title={t('capture.zoomIn')}
            >
              +
            </button>
            {isFullZoomed && (
              <button
                type="button"
                onClick={handleFullZoomReset}
                className="text-white text-xs px-1.5 py-0.5 hover:bg-white/20 rounded ml-1"
                title={t('capture.resetZoom')}
              >
                1:1
              </button>
            )}
          </div>
        )}
        {/* Resize handle — bottom-right corner, hidden in compact mode */}
        {!compact && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50"
            onMouseDown={startPreviewResize}
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)',
              borderRadius: '0 0 8px 0',
            }}
          />
        )}
      </div>
    </Card>
  )

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
              {zoomCanvas}
            </TabsContent>
            <TabsContent value="full">
              {fullCanvas}
            </TabsContent>
          </Tabs>
        ) : mode === 'full' ? (
          fullCanvas
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

      {/* Navigation hint — for zoom mode and full mode when viewport is zoomed, hidden in compact */}
      {!compact && isCapturing && currentFrame && (mode !== 'full' || isFullZoomed) && (
        <P className="text-xs text-muted-foreground">
          {mode === 'full' || (mode === 'both' && activeTab === 'full')
            ? (disableZoom ? t('capture.fullPanHintOnly') : t('capture.fullPanHint'))
            : (disableZoom ? t('capture.dragToNavigateOnly') : t('capture.dragToNavigate'))}
        </P>
      )}

      {/* Status + Controls */}
      {isCapturing ? (
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-2">
            <Div
              className={`h-2 w-2 rounded-full ${isAnalyzing ? 'bg-warning animate-pulse' : 'bg-success'}`}
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
          <Div className="flex items-center gap-2">
            <Button
              className="flex-1 h-12 text-base font-semibold"
              variant="default"
              onClick={onStart}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
              {t('capture.start')}
            </Button>
            {extraButtons}
          </Div>
        </>
      )}
    </Div>
  )
}
