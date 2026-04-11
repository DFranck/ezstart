/**
 * Create a canvas from ImageData.
 */
export function canvasFromImageData(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * Convert ImageData to a PNG Blob.
 */
export async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = canvasFromImageData(imageData)
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob ?? new Blob()), 'image/png')
  })
}

/**
 * Convert ImageData to a JPEG base64 data URL.
 *
 * @param imageData - Source image data
 * @param quality - JPEG quality 0-1 (default: 0.5)
 */
export function imageDataToJpegBase64(imageData: ImageData, quality = 0.5): string {
  const canvas = canvasFromImageData(imageData)
  return canvas.toDataURL('image/jpeg', quality)
}
