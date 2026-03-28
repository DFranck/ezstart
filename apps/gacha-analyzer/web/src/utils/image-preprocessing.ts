/** Adaptive scale factor based on crop width */
export function getAdaptiveScale(width: number): number {
  if (width < 300) return 3
  if (width < 600) return 2
  return 1
}

interface PreprocessOptions {
  /** Upscale factor (default 3) */
  scale?: number
  /** Contrast multiplier (default 1.8) */
  contrast?: number
  /** Binarize threshold 0-255 (default 128) */
  threshold?: number
  /** Apply binarization step (default true). Set false to keep grayscale values */
  binarize?: boolean
  /** Apply sharpen — unused for now, binarization is sufficient (default true) */
  sharpen?: boolean
  /** Convert to grayscale (default true). Set false to keep RGB colors */
  grayscale?: boolean
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
  const shouldBinarize = options?.binarize ?? true
  const shouldGrayscale = options?.grayscale ?? true

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
    if (shouldGrayscale) {
      // Grayscale using luminance weights
      let gray = 0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!

      // Contrast: shift around midpoint then scale
      gray = ((gray / 255 - 0.5) * contrastFactor + 0.5) * 255
      gray = Math.max(0, Math.min(255, gray))

      // Binarize for clean black/white text (skip if binarize is false)
      if (shouldBinarize) {
        gray = gray > binarizeThreshold ? 255 : 0
      }

      pixels[i] = gray
      pixels[i + 1] = gray
      pixels[i + 2] = gray
    } else {
      // Keep RGB, apply contrast to each channel separately
      for (let c = 0; c < 3; c++) {
        let val = pixels[i + c]!
        if (contrastFactor !== 1.0) {
          val = ((val / 255 - 0.5) * contrastFactor + 0.5) * 255
          pixels[i + c] = Math.max(0, Math.min(255, val))
        }
      }

      // Binarize without grayscale: compute luminance, threshold to black or white RGB
      if (shouldBinarize) {
        const luminance = 0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!
        const bw = luminance > binarizeThreshold ? 255 : 0
        pixels[i] = bw
        pixels[i + 1] = bw
        pixels[i + 2] = bw
      }
    }
    // alpha unchanged
  }

  scaledCtx.putImageData(scaled, 0, 0)
  return scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height)
}
