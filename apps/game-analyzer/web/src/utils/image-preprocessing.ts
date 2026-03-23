interface PreprocessOptions {
  /** Upscale factor (default 3) */
  scale?: number
  /** Contrast multiplier (default 1.8) */
  contrast?: number
  /** Binarize threshold 0-255 (default 128) */
  threshold?: number
  /** Apply sharpen — unused for now, binarization is sufficient (default true) */
  sharpen?: boolean
}

/**
 * Preprocess an image for better OCR results:
 * 1. Upscale 3x for bigger characters
 * 2. Convert to grayscale
 * 3. Increase contrast
 * 4. Binarize (threshold) for clean black/white
 */
export function preprocessForOcr(imageData: ImageData, options?: PreprocessOptions): ImageData {
  const scale = options?.scale ?? 3
  const contrastFactor = options?.contrast ?? 1.8
  const binarizeThreshold = options?.threshold ?? 128

  // 1. Upscale using canvas with high-quality interpolation
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = imageData.width
  srcCanvas.height = imageData.height
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(imageData, 0, 0)

  const scaledCanvas = document.createElement('canvas')
  scaledCanvas.width = imageData.width * scale
  scaledCanvas.height = imageData.height * scale
  const scaledCtx = scaledCanvas.getContext('2d')!

  scaledCtx.imageSmoothingEnabled = true
  scaledCtx.imageSmoothingQuality = 'high'
  scaledCtx.drawImage(srcCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height)

  // 2. Get pixel data and process in a single pass: grayscale + contrast + binarize
  const scaled = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height)
  const pixels = scaled.data

  for (let i = 0; i < pixels.length; i += 4) {
    // Grayscale using luminance weights
    let gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]

    // Contrast: shift around midpoint then scale
    gray = ((gray / 255 - 0.5) * contrastFactor + 0.5) * 255
    gray = Math.max(0, Math.min(255, gray))

    // Binarize for clean black/white text
    gray = gray > binarizeThreshold ? 255 : 0

    pixels[i] = gray
    pixels[i + 1] = gray
    pixels[i + 2] = gray
    // alpha unchanged
  }

  scaledCtx.putImageData(scaled, 0, 0)
  return scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height)
}
