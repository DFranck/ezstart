import type { MaskRegion } from '../types'

/**
 * Black out rectangular regions on an ImageData.
 * Useful for masking UI elements before OCR processing.
 *
 * @param imageData - Source image data
 * @param masks - Array of regions to black out (% coordinates 0-100)
 */
export function applyBlackoutMasks(imageData: ImageData, masks: MaskRegion[]): ImageData {
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
