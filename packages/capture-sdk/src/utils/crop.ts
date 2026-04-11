import type { CropOptions } from '../types'

/** Flat rectangle region (% coordinates 0-100) */
type RectRegion = { x: number; y: number; width: number; height: number }

/**
 * Crop an ImageData to the specified region.
 * Region coordinates are percentages (0-100) of the original dimensions.
 *
 * Accepts either a flat rect `{ x, y, width, height }` or full CropOptions with scale.
 */
export function cropImageData(imageData: ImageData, region: RectRegion): ImageData
export function cropImageData(imageData: ImageData, options: CropOptions): ImageData
export function cropImageData(
  imageData: ImageData,
  optionsOrRegion: CropOptions | RectRegion
): ImageData {
  const region = 'region' in optionsOrRegion ? optionsOrRegion.region : optionsOrRegion
  const scale = 'region' in optionsOrRegion ? (optionsOrRegion.scale ?? 1) : 1

  const { width: srcW, height: srcH } = imageData

  // Convert % region to absolute pixel coordinates
  const cropX = Math.round((region.x / 100) * srcW)
  const cropY = Math.round((region.y / 100) * srcH)
  const cropW = Math.round((region.width / 100) * srcW)
  const cropH = Math.round((region.height / 100) * srcH)

  // Clamp to source bounds
  const safeX = Math.max(0, Math.min(cropX, srcW))
  const safeY = Math.max(0, Math.min(cropY, srcH))
  const safeW = Math.min(cropW, srcW - safeX)
  const safeH = Math.min(cropH, srcH - safeY)

  if (safeW <= 0 || safeH <= 0) {
    return new ImageData(1, 1)
  }

  // Use canvas for efficient cropping + optional scaling
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = srcW
  srcCanvas.height = srcH
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(imageData, 0, 0)

  const outW = Math.round(safeW * scale)
  const outH = Math.round(safeH * scale)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })!

  if (scale !== 1) {
    outCtx.imageSmoothingEnabled = true
    outCtx.imageSmoothingQuality = 'high'
  }

  outCtx.drawImage(srcCanvas, safeX, safeY, safeW, safeH, 0, 0, outW, outH)

  return outCtx.getImageData(0, 0, outW, outH)
}

/**
 * Crop a canvas to the specified region, returning a new canvas.
 * Region coordinates are percentages (0-100) of the original dimensions.
 */
export function cropCanvas(canvas: HTMLCanvasElement, options: CropOptions): HTMLCanvasElement {
  const { region, scale = 1 } = options
  const { width: srcW, height: srcH } = canvas

  const cropX = Math.round((region.x / 100) * srcW)
  const cropY = Math.round((region.y / 100) * srcH)
  const cropW = Math.round((region.width / 100) * srcW)
  const cropH = Math.round((region.height / 100) * srcH)

  const safeX = Math.max(0, Math.min(cropX, srcW))
  const safeY = Math.max(0, Math.min(cropY, srcH))
  const safeW = Math.min(cropW, srcW - safeX)
  const safeH = Math.min(cropH, srcH - safeY)

  const outW = Math.max(1, Math.round(safeW * scale))
  const outH = Math.max(1, Math.round(safeH * scale))

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const ctx = outCanvas.getContext('2d')!

  if (scale !== 1) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
  }

  ctx.drawImage(canvas, safeX, safeY, safeW, safeH, 0, 0, outW, outH)

  return outCanvas
}
