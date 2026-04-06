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
 * Component
 * ----------------------------------------------------------------------------------------*/

export function ImageCropper({
  src,
  onCropComplete: onCropDone,
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
  labels,
}: ImageCropperProps) {
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

  const l = {
    apply: labels?.apply ?? 'Apply',
    cancel: labels?.cancel ?? 'Cancel',
    zoom: labels?.zoom ?? 'Zoom',
    rotation: labels?.rotation ?? 'Rotation',
    resetRotation: labels?.resetRotation ?? 'Reset',
  }

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
