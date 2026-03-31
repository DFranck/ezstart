import type { RoiRect } from '@/components/roi-selector'
import type { MaskRect } from '@/components/blackout-mask'

/** Create a canvas from ImageData */
export function canvasFromImageData(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.putImageData(imageData, 0, 0)
  return canvas
}

/** Crop an ImageData to the given ROI (percentages 0-100) */
export function cropImageData(imageData: ImageData, roi: RoiRect): ImageData {
  const srcCanvas = canvasFromImageData(imageData)

  const sx = Math.round((roi.x / 100) * imageData.width)
  const sy = Math.round((roi.y / 100) * imageData.height)
  const sw = Math.round((roi.width / 100) * imageData.width)
  const sh = Math.round((roi.height / 100) * imageData.height)

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = sw
  cropCanvas.height = sh
  const ctx = cropCanvas.getContext('2d')
  if (!ctx) return imageData

  ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh)
  return ctx.getImageData(0, 0, sw, sh)
}

/** Black-out mask regions on an ImageData (for OCR — always black) */
export function applyBlackoutMasks(imageData: ImageData, masks: MaskRect[]): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)

  ctx.fillStyle = 'black'
  for (const mask of masks) {
    const x = Math.round((mask.x / 100) * canvas.width)
    const y = Math.round((mask.y / 100) * canvas.height)
    const w = Math.round((mask.width / 100) * canvas.width)
    const h = Math.round((mask.height / 100) * canvas.height)
    ctx.fillRect(x, y, w, h)
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/** Convert ImageData to a PNG Blob */
export async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = canvasFromImageData(imageData)
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob ?? new Blob()), 'image/png')
  })
}

/** Convert ImageData to a compressed JPEG base64 data URL for thumbnail storage */
export function imageDataToJpegBase64(imageData: ImageData, quality = 0.5): string {
  const canvas = canvasFromImageData(imageData)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Compute a fast hash from an ImageData by sampling ~1000 pixels */
export function quickHash(imageData: ImageData): string {
  const data = imageData.data
  const step = Math.max(1, Math.floor(data.length / 1000))
  let hash = 0
  for (let i = 0; i < data.length; i += step * 4) {
    hash = ((hash << 5) - hash + data[i]! + data[i + 1]! + data[i + 2]!) | 0
  }
  return hash.toString(36)
}
