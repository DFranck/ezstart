'use client'

import * as React from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { cn } from '../../lib/utils'

/* ------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------*/

export interface ImageCropperProps {
  /** Image source (data URL, blob URL, or regular URL) */
  src: string
  /** Called when crop is applied with the cropped image as data URL + File */
  onCropComplete: (croppedDataUrl: string, croppedFile: File) => void
  /** Called when crop is cancelled */
  onCancel?: () => void
  /** Cropper mode: pan-zoom (default), edge-drag (rectangle handles), round (circle) */
  mode?: 'pan-zoom' | 'edge-drag' | 'round'
  /** Initial crop rectangle for edge-drag mode (percentages 0-100) */
  initialCrop?: { top: number; left: number; bottom: number; right: number }
  /** Aspect ratio constraint (e.g., 1 for square, 16/9 for landscape). undefined = free crop */
  aspectRatio?: number
  /** Preset aspect ratios to show as buttons */
  aspectPresets?: Array<{ label: string; value: number | undefined }>
  /** Show rotation controls */
  showRotation?: boolean
  /** Show zoom controls (default true) */
  showZoom?: boolean
  /** Max output width in pixels (for compression) */
  maxOutputWidth?: number
  /** Output quality for JPEG (0-1) */
  outputQuality?: number
  /** Output format */
  outputFormat?: 'image/png' | 'image/jpeg'
  /** Crop shape: 'rect' (default) or 'round' (circle crop) */
  cropShape?: 'rect' | 'round'
  /** Theme color for handles/borders (CSS color string, e.g., '#d4a017' or 'hsl(var(--primary))') */
  themeColor?: string
  /** Custom class for the container */
  className?: string
  /** i18n labels */
  labels?: {
    apply?: string
    cancel?: string
    zoom?: string
    rotation?: string
    resetRotation?: string
  }
}

/* ------------------------------------------------------------------------------------------
 * Default presets
 * ----------------------------------------------------------------------------------------*/

const DEFAULT_PRESETS: Array<{ label: string; value: number | undefined }> = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: 'A4', value: 210 / 297 },
]

/* ------------------------------------------------------------------------------------------
 * Canvas utilities
 * ----------------------------------------------------------------------------------------*/

type CropPixels = { x: number; y: number; width: number; height: number }

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

function rotateBoundingBox(w: number, h: number, rad: number) {
  return {
    width: Math.round(Math.abs(Math.cos(rad) * w) + Math.abs(Math.sin(rad) * h)),
    height: Math.round(Math.abs(Math.sin(rad) * w) + Math.abs(Math.cos(rad) * h)),
  }
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropPixels,
  rotation = 0,
  maxWidth?: number,
  quality = 0.85,
  format = 'image/jpeg'
): Promise<{ dataUrl: string; file: File }> {
  const image = await createImage(imageSrc)
  const rot = ((rotation % 360) + 360) % 360
  const radians = (rot * Math.PI) / 180

  // 1) Rotated canvas (bounding box)
  const box = rotateBoundingBox(image.width, image.height, radians)
  const rCanvas = document.createElement('canvas')
  rCanvas.width = box.width
  rCanvas.height = box.height
  const rCtx = rCanvas.getContext('2d')
  if (!rCtx) throw new Error('Canvas 2D context not available')

  rCtx.imageSmoothingEnabled = true
  rCtx.imageSmoothingQuality = 'high'
  rCtx.translate(box.width / 2, box.height / 2)
  rCtx.rotate(radians)
  rCtx.drawImage(image, -image.width / 2, -image.height / 2)
  rCtx.setTransform(1, 0, 0, 1, 0, 0)

  // 2) Crop canvas
  let outW = pixelCrop.width
  let outH = pixelCrop.height

  // 3) Resize if maxWidth specified
  if (maxWidth && outW > maxWidth) {
    const ratio = maxWidth / outW
    outW = maxWidth
    outH = Math.round(outH * ratio)
  }

  const out = document.createElement('canvas')
  out.width = outW
  out.height = outH
  const oCtx = out.getContext('2d')
  if (!oCtx) throw new Error('Canvas 2D context not available')

  oCtx.imageSmoothingEnabled = true
  oCtx.imageSmoothingQuality = 'high'
  oCtx.drawImage(
    rCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH
  )

  const ext = format === 'image/png' ? 'png' : 'jpg'
  const q = format === 'image/png' ? 1 : quality

  const blob: Blob = await new Promise(resolve =>
    out.toBlob(b => resolve(b as Blob), format, q)
  )
  const file = new File([blob], `cropped.${ext}`, { type: format })
  const dataUrl = out.toDataURL(format, q)

  return { dataUrl, file }
}

/* ------------------------------------------------------------------------------------------
 * Edge-Drag Cropper (internal)
 * Drag/resize logic inspired by MultiZoneSelector from gacha-analyzer
 * ----------------------------------------------------------------------------------------*/

type EdgeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

interface CropRect { top: number; left: number; bottom: number; right: number }

const EDGE_MIN_SIZE = 10 // minimum 10% in each dimension

function edgeClamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

const HANDLE_CURSORS: Record<EdgeHandle, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
}

function EdgeDragCropper({
  src,
  initialCrop,
  onCropDone,
  onCancel,
  maxOutputWidth,
  outputQuality = 0.85,
  outputFormat = 'image/jpeg',
  themeColor,
  className,
  labels,
}: {
  src: string
  initialCrop?: CropRect
  onCropDone: (dataUrl: string, file: File) => void
  onCancel?: () => void
  maxOutputWidth?: number
  outputQuality?: number
  outputFormat?: 'image/png' | 'image/jpeg'
  themeColor?: string
  className?: string
  labels: { apply: string; cancel: string }
}) {
  const [crop, setCrop] = React.useState<CropRect>(
    initialCrop ?? { top: 2, left: 2, bottom: 98, right: 98 }
  )
  const [isApplying, setIsApplying] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const cropRef = React.useRef(crop)
  cropRef.current = crop

  const dragRef = React.useRef<{
    type: 'move' | 'resize'
    handle?: EdgeHandle
    startX: number
    startY: number
    startCrop: CropRect
  } | null>(null)

  // Sync initialCrop from props
  React.useEffect(() => {
    if (initialCrop && !dragRef.current) {
      setCrop(initialCrop)
    }
  }, [initialCrop])

  // Global drag handlers
  React.useEffect(() => {
    function handleMove(clientX: number, clientY: number) {
      const drag = dragRef.current
      const el = containerRef.current
      if (!drag || !el) return
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dx = ((clientX - drag.startX) / rect.width) * 100
      const dy = ((clientY - drag.startY) / rect.height) * 100
      const s = drag.startCrop
      let nc = { ...s }

      if (drag.type === 'move') {
        const w = s.right - s.left
        const h = s.bottom - s.top
        const newLeft = edgeClamp(s.left + dx, 0, 100 - w)
        const newTop = edgeClamp(s.top + dy, 0, 100 - h)
        nc = { top: newTop, left: newLeft, bottom: newTop + h, right: newLeft + w }
      } else if (drag.handle) {
        const h = drag.handle
        if (h === 'n' || h === 'nw' || h === 'ne') {
          nc.top = edgeClamp(s.top + dy, 0, s.bottom - EDGE_MIN_SIZE)
        }
        if (h === 's' || h === 'sw' || h === 'se') {
          nc.bottom = edgeClamp(s.bottom + dy, s.top + EDGE_MIN_SIZE, 100)
        }
        if (h === 'w' || h === 'nw' || h === 'sw') {
          nc.left = edgeClamp(s.left + dx, 0, s.right - EDGE_MIN_SIZE)
        }
        if (h === 'e' || h === 'ne' || h === 'se') {
          nc.right = edgeClamp(s.right + dx, s.left + EDGE_MIN_SIZE, 100)
        }
      }

      setCrop(nc)
      cropRef.current = nc
    }

    function handleEnd() { dragRef.current = null }

    function onMouseMove(e: MouseEvent) { handleMove(e.clientX, e.clientY) }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0]
      if (e.touches.length === 1 && t) { e.preventDefault(); handleMove(t.clientX, t.clientY) }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [])

  function startDrag(
    clientX: number, clientY: number,
    type: 'move' | 'resize', handle?: EdgeHandle
  ) {
    dragRef.current = { type, handle, startX: clientX, startY: clientY, startCrop: { ...cropRef.current } }
  }

  function onMD(e: React.MouseEvent, type: 'move' | 'resize', handle?: EdgeHandle) {
    e.preventDefault(); e.stopPropagation()
    startDrag(e.clientX, e.clientY, type, handle)
  }
  function onTS(e: React.TouchEvent, type: 'move' | 'resize', handle?: EdgeHandle) {
    e.stopPropagation()
    const t = e.touches[0]
    if (e.touches.length === 1 && t) startDrag(t.clientX, t.clientY, type, handle)
  }

  const handleApply = React.useCallback(async () => {
    setIsApplying(true)
    try {
      const image = await createImage(src)
      const c = cropRef.current
      const px: CropPixels = {
        x: (c.left / 100) * image.width,
        y: (c.top / 100) * image.height,
        width: ((c.right - c.left) / 100) * image.width,
        height: ((c.bottom - c.top) / 100) * image.height,
      }
      const { dataUrl, file } = await getCroppedImg(src, px, 0, maxOutputWidth, outputQuality, outputFormat)
      onCropDone(dataUrl, file)
    } finally {
      setIsApplying(false)
    }
  }, [src, maxOutputWidth, outputQuality, outputFormat, onCropDone])

  const handles: EdgeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

  function handleStyle(h: EdgeHandle): React.CSSProperties {
    const color = themeColor || 'hsl(var(--primary))'
    const base: React.CSSProperties = {
      position: 'absolute', backgroundColor: color,
      border: '2px solid white', borderRadius: 3,
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      zIndex: 30, pointerEvents: 'auto', touchAction: 'none',
      cursor: HANDLE_CURSORS[h],
    }
    const cs = 18 // corner size (was 14)
    const es = 28 // edge length (was 20)
    const et = 10 // edge thickness (was 8)
    switch (h) {
      case 'nw': return { ...base, width: cs, height: cs, top: -cs / 2, left: -cs / 2 }
      case 'ne': return { ...base, width: cs, height: cs, top: -cs / 2, right: -cs / 2 }
      case 'sw': return { ...base, width: cs, height: cs, bottom: -cs / 2, left: -cs / 2 }
      case 'se': return { ...base, width: cs, height: cs, bottom: -cs / 2, right: -cs / 2 }
      case 'n': return { ...base, width: es, height: et, top: -et / 2, left: '50%', transform: 'translateX(-50%)' }
      case 's': return { ...base, width: es, height: et, bottom: -et / 2, left: '50%', transform: 'translateX(-50%)' }
      case 'e': return { ...base, width: et, height: es, right: -et / 2, top: '50%', transform: 'translateY(-50%)' }
      case 'w': return { ...base, width: et, height: es, left: -et / 2, top: '50%', transform: 'translateY(-50%)' }
    }
  }

  const c = crop

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Image + overlay area */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border bg-muted/30 select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Raw image */}
        <img src={src} alt="" className="block w-full h-auto" draggable={false} />

        {/* Dimmed overlays (4 regions around the crop rect) */}
        {/* Top */}
        <div className="absolute left-0 top-0 bg-black/50 pointer-events-none" style={{ width: '100%', height: `${c.top}%` }} />
        {/* Bottom */}
        <div className="absolute left-0 bottom-0 bg-black/50 pointer-events-none" style={{ width: '100%', height: `${100 - c.bottom}%` }} />
        {/* Left */}
        <div className="absolute left-0 bg-black/50 pointer-events-none" style={{ top: `${c.top}%`, width: `${c.left}%`, height: `${c.bottom - c.top}%` }} />
        {/* Right */}
        <div className="absolute right-0 bg-black/50 pointer-events-none" style={{ top: `${c.top}%`, width: `${100 - c.right}%`, height: `${c.bottom - c.top}%` }} />

        {/* Crop rectangle */}
        <div
          style={{
            position: 'absolute',
            top: `${c.top}%`, left: `${c.left}%`,
            width: `${c.right - c.left}%`, height: `${c.bottom - c.top}%`,
            border: `2px solid ${themeColor || 'hsl(var(--primary))'}`,
            boxSizing: 'border-box',
            cursor: 'move',
            touchAction: 'none',
            overflow: 'visible',
            zIndex: 20,
          }}
          onMouseDown={e => onMD(e, 'move')}
          onTouchStart={e => onTS(e, 'move')}
        >
          {/* Resize handles */}
          {handles.map(h => (
            <div
              key={h}
              style={handleStyle(h)}
              onMouseDown={e => onMD(e, 'resize', h)}
              onTouchStart={e => onTS(e, 'resize', h)}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium bg-background hover:bg-accent transition-colors text-foreground"
          >
            {labels.cancel}
          </button>
        )}
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isApplying ? '...' : labels.apply}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------------------------------*/

export function ImageCropper({
  src,
  onCropComplete: onCropDone,
  onCancel,
  mode = 'pan-zoom',
  initialCrop,
  aspectRatio,
  aspectPresets,
  showRotation = false,
  showZoom = true,
  maxOutputWidth,
  outputQuality = 0.85,
  outputFormat = 'image/jpeg',
  cropShape = 'rect',
  themeColor,
  className,
  labels,
}: ImageCropperProps) {
  const l = {
    apply: labels?.apply ?? 'Apply',
    cancel: labels?.cancel ?? 'Cancel',
    zoom: labels?.zoom ?? 'Zoom',
    rotation: labels?.rotation ?? 'Rotation',
    resetRotation: labels?.resetRotation ?? 'Reset',
  }

  // Resolve effective mode: 'round' maps to pan-zoom with cropShape='round'
  const effectiveMode = mode === 'round' ? 'pan-zoom' : mode
  const effectiveCropShape = mode === 'round' ? 'round' : cropShape

  // Edge-drag mode — delegate entirely
  if (effectiveMode === 'edge-drag') {
    return (
      <EdgeDragCropper
        src={src}
        initialCrop={initialCrop}
        onCropDone={onCropDone}
        onCancel={onCancel}
        maxOutputWidth={maxOutputWidth}
        outputQuality={outputQuality}
        outputFormat={outputFormat}
        themeColor={themeColor}
        className={className}
        labels={{ apply: l.apply, cancel: l.cancel }}
      />
    )
  }

  // Pan-zoom mode (default) — uses react-easy-crop
  return (
    <PanZoomCropper
      src={src}
      onCropDone={onCropDone}
      onCancel={onCancel}
      aspectRatio={aspectRatio}
      aspectPresets={aspectPresets}
      showRotation={showRotation}
      showZoom={showZoom}
      maxOutputWidth={maxOutputWidth}
      outputQuality={outputQuality}
      outputFormat={outputFormat}
      cropShape={effectiveCropShape}
      className={className}
      labels={l}
    />
  )
}

/* ------------------------------------------------------------------------------------------
 * Pan-Zoom Cropper (internal, original behavior)
 * ----------------------------------------------------------------------------------------*/

function PanZoomCropper({
  src,
  onCropDone,
  onCancel,
  aspectRatio,
  aspectPresets,
  showRotation = false,
  showZoom = true,
  maxOutputWidth,
  outputQuality = 0.85,
  outputFormat = 'image/jpeg',
  cropShape = 'rect',
  className,
  labels: l,
}: {
  src: string
  onCropDone: (dataUrl: string, file: File) => void
  onCancel?: () => void
  aspectRatio?: number
  aspectPresets?: Array<{ label: string; value: number | undefined }>
  showRotation?: boolean
  showZoom?: boolean
  maxOutputWidth?: number
  outputQuality?: number
  outputFormat?: 'image/png' | 'image/jpeg'
  cropShape?: 'rect' | 'round'
  className?: string
  labels: { apply: string; cancel: string; zoom: string; rotation: string; resetRotation: string }
}) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<CropPixels | null>(null)
  const [activeAspect, setActiveAspect] = React.useState<number | undefined>(aspectRatio)
  const [isApplying, setIsApplying] = React.useState(false)

  const presets = aspectPresets ?? (aspectRatio === undefined ? DEFAULT_PRESETS : undefined)

  const onCropAreaChange = React.useCallback((_area: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx as CropPixels)
  }, [])

  const handleApply = React.useCallback(async () => {
    if (!croppedAreaPixels) return
    setIsApplying(true)
    try {
      const { dataUrl, file } = await getCroppedImg(
        src,
        croppedAreaPixels,
        rotation,
        maxOutputWidth,
        outputQuality,
        outputFormat
      )
      onCropDone(dataUrl, file)
    } finally {
      setIsApplying(false)
    }
  }, [croppedAreaPixels, src, rotation, maxOutputWidth, outputQuality, outputFormat, onCropDone])

  const handlePreset = React.useCallback((value: number | undefined) => {
    setActiveAspect(value)
  }, [])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Crop area */}
      <div className="relative w-full flex-1 min-h-[300px] overflow-hidden rounded-lg border bg-muted/30">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={cropShape === 'round' ? 1 : activeAspect}
          cropShape={cropShape}
          restrictPosition={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropAreaChange}
          objectFit="contain"
          showGrid={cropShape !== 'round'}
          minZoom={0.1}
          maxZoom={5}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {/* Aspect presets (hidden for round crop — always 1:1) */}
        {cropShape !== 'round' && presets && presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  activeAspect === p.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Zoom slider */}
        {showZoom && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-14 shrink-0">{l.zoom}</span>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 h-2 appearance-none rounded-full bg-muted cursor-pointer accent-primary
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow
                [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
              aria-label={l.zoom}
            />
            <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
              {zoom.toFixed(1)}x
            </span>
          </div>
        )}

        {/* Rotation controls */}
        {showRotation && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-14 shrink-0">{l.rotation}</span>
            <button
              type="button"
              onClick={() => setRotation(r => r - 90)}
              className="px-2 py-1 rounded border text-xs font-medium bg-muted hover:bg-accent transition-colors"
              aria-label="Rotate -90 degrees"
            >
              -90&deg;
            </button>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={e => setRotation(Number(e.target.value))}
              className="flex-1 h-2 appearance-none rounded-full bg-muted cursor-pointer accent-primary
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow
                [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
              aria-label={l.rotation}
            />
            <button
              type="button"
              onClick={() => setRotation(r => r + 90)}
              className="px-2 py-1 rounded border text-xs font-medium bg-muted hover:bg-accent transition-colors"
              aria-label="Rotate +90 degrees"
            >
              +90&deg;
            </button>
            <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
              {rotation}&deg;
            </span>
            {rotation !== 0 && (
              <button
                type="button"
                onClick={() => setRotation(0)}
                className="text-xs text-primary hover:underline"
              >
                {l.resetRotation}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium
              bg-background hover:bg-accent transition-colors text-foreground"
          >
            {l.cancel}
          </button>
        )}
        <button
          type="button"
          onClick={handleApply}
          disabled={!croppedAreaPixels || isApplying}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isApplying ? '...' : l.apply}
        </button>
      </div>
    </div>
  )
}
