import type { PreprocessOptions } from '../types'

/**
 * Apply image preprocessing transformations to an ImageData.
 *
 * Processing pipeline:
 * 1. Scale via canvas with high-quality interpolation
 * 2. Grayscale using luminance weights (0.299, 0.587, 0.114)
 * 3. Contrast via midpoint shift: ((val/255 - 0.5) * contrast + 0.5) * 255
 * 4. Binarize: gray > threshold ? 255 : 0
 *
 * Supports both grayscale+binarize and RGB+contrast modes.
 */
export function preprocessImageData(imageData: ImageData, options: PreprocessOptions): ImageData {
  const {
    grayscale: shouldGrayscale = true,
    contrast: contrastFactor = 1.0,
    binarizeThreshold = 128,
    scale = 1,
    binarize: shouldBinarize = false,
  } = options

  // 1. Scale using canvas with high-quality interpolation
  let result: ImageData
  if (scale !== 1 && scale > 0) {
    const srcCanvas = document.createElement('canvas')
    srcCanvas.width = imageData.width
    srcCanvas.height = imageData.height
    const srcCtx = srcCanvas.getContext('2d')!
    srcCtx.putImageData(imageData, 0, 0)

    const scaledCanvas = document.createElement('canvas')
    scaledCanvas.width = Math.round(imageData.width * scale)
    scaledCanvas.height = Math.round(imageData.height * scale)
    const scaledCtx = scaledCanvas.getContext('2d', { willReadFrequently: true })!

    scaledCtx.imageSmoothingEnabled = true
    scaledCtx.imageSmoothingQuality = 'high'
    scaledCtx.drawImage(srcCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height)

    result = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height)
  } else {
    result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
  }

  // 2. Pixel-level transforms: grayscale + contrast + binarize
  const needsPixelProcessing = shouldGrayscale || contrastFactor !== 1.0 || shouldBinarize

  if (needsPixelProcessing) {
    const pixels = result.data

    for (let i = 0; i < pixels.length; i += 4) {
      if (shouldGrayscale) {
        // Grayscale using luminance weights
        let gray = 0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!

        // Contrast: shift around midpoint then scale
        if (contrastFactor !== 1.0) {
          gray = ((gray / 255 - 0.5) * contrastFactor + 0.5) * 255
          gray = Math.max(0, Math.min(255, gray))
        }

        // Binarize for clean black/white
        if (shouldBinarize) {
          gray = gray > binarizeThreshold ? 255 : 0
        }

        pixels[i] = gray
        pixels[i + 1] = gray
        pixels[i + 2] = gray
      } else {
        // Keep RGB, apply contrast to each channel separately
        if (contrastFactor !== 1.0) {
          for (let c = 0; c < 3; c++) {
            let val = pixels[i + c]!
            val = ((val / 255 - 0.5) * contrastFactor + 0.5) * 255
            pixels[i + c] = Math.max(0, Math.min(255, val))
          }
        }

        // Binarize without grayscale: compute luminance, threshold to black or white
        if (shouldBinarize) {
          const luminance = 0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!
          const bw = luminance > binarizeThreshold ? 255 : 0
          pixels[i] = bw
          pixels[i + 1] = bw
          pixels[i + 2] = bw
        }
      }
      // Alpha channel unchanged
    }
  }

  return result
}

/**
 * Apply image preprocessing transformations to a canvas, returning a new canvas.
 */
export function preprocessCanvas(
  canvas: HTMLCanvasElement,
  options: PreprocessOptions
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return canvas
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const processed = preprocessImageData(imageData, options)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = processed.width
  outCanvas.height = processed.height
  const outCtx = outCanvas.getContext('2d')!
  outCtx.putImageData(processed, 0, 0)

  return outCanvas
}

/**
 * Get an adaptive scale factor based on image width.
 * Smaller images need more upscaling for OCR readability.
 */
export function getAdaptiveScale(width: number): number {
  if (width < 300) return 3
  if (width < 600) return 2
  return 1
}
