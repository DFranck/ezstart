/**
 * Server-side image preprocessing for OCR bench
 *
 * Applies various transformations (scale, grayscale, contrast, binarize)
 * to test which preprocessing pipeline yields the best OCR results.
 */

import sharp from 'sharp'

export interface PreprocessOptions {
  scale?: number
  grayscale?: boolean
  contrast?: number
  binarize?: boolean
  threshold?: number
}

export async function preprocessImage(
  buffer: Buffer,
  options: PreprocessOptions
): Promise<Buffer> {
  let img = sharp(buffer)

  if (options.scale && options.scale > 1) {
    const meta = await img.metadata()
    img = img.resize(
      Math.round(meta.width! * options.scale),
      Math.round(meta.height! * options.scale),
      { kernel: 'lanczos3' }
    )
  }

  if (options.grayscale) {
    img = img.grayscale()
  }

  if (options.contrast && options.contrast !== 1) {
    img = img.linear(options.contrast, -(128 * (options.contrast - 1)))
  }

  if (options.binarize) {
    img = img.threshold(options.threshold || 128)
  }

  return img.png().toBuffer()
}
