/**
 * Compute a simple perceptual hash of an ImageData.
 * Downscales to hashSize x hashSize, converts to grayscale, then generates
 * a binary hash based on whether each pixel is above or below the average.
 *
 * @param imageData - Source image data
 * @param hashSize - Grid size for the hash (default: 8, produces 64-bit hash)
 * @returns Hex string representing the perceptual hash
 */
export function imageHash(imageData: ImageData, hashSize: number = 8): string {
  // Downscale to hashSize x hashSize using canvas
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = imageData.width
  srcCanvas.height = imageData.height
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(imageData, 0, 0)

  const smallCanvas = document.createElement('canvas')
  smallCanvas.width = hashSize
  smallCanvas.height = hashSize
  const smallCtx = smallCanvas.getContext('2d', { willReadFrequently: true })!
  smallCtx.imageSmoothingEnabled = true
  smallCtx.imageSmoothingQuality = 'medium'
  smallCtx.drawImage(srcCanvas, 0, 0, hashSize, hashSize)

  const smallData = smallCtx.getImageData(0, 0, hashSize, hashSize)
  const pixels = smallData.data
  const totalPixels = hashSize * hashSize

  // Convert to grayscale values
  const grays: number[] = new Array(totalPixels)
  let sum = 0
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4
    const gray = 0.299 * pixels[offset]! + 0.587 * pixels[offset + 1]! + 0.114 * pixels[offset + 2]!
    grays[i] = gray
    sum += gray
  }

  const avg = sum / totalPixels

  // Build binary hash: 1 if above average, 0 if below
  let hash = ''
  for (let i = 0; i < totalPixels; i++) {
    hash += grays[i]! >= avg ? '1' : '0'
  }

  // Convert binary string to hex
  let hex = ''
  for (let i = 0; i < hash.length; i += 4) {
    hex += parseInt(hash.substring(i, i + 4), 2).toString(16)
  }

  return hex
}

/**
 * Compute the Hamming distance between two hash strings.
 * Returns the number of differing characters (bits when comparing hex digit by digit).
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error(
      `Hash length mismatch: ${hash1.length} vs ${hash2.length}. Hashes must be the same size.`
    )
  }

  // Convert hex to binary and compare bit by bit
  const bin1 = hexToBinary(hash1)
  const bin2 = hexToBinary(hash2)

  let distance = 0
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) {
      distance++
    }
  }

  return distance
}

/**
 * Check if two perceptual hashes represent the same (or very similar) image.
 *
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @param threshold - Maximum Hamming distance to consider "same" (default: 5)
 * @returns true if the images are perceptually similar
 */
export function isSameImage(hash1: string, hash2: string, threshold: number = 5): boolean {
  return hammingDistance(hash1, hash2) <= threshold
}

/**
 * Fast numeric hash by sampling ~1000 pixels.
 * Good for frame deduplication caches where speed matters more than accuracy.
 *
 * @param imageData - Source image data
 * @returns Base-36 string hash
 */
export function quickHash(imageData: ImageData): string {
  const data = imageData.data
  const step = Math.max(1, Math.floor(data.length / 1000))
  let hash = 0
  for (let i = 0; i < data.length; i += step * 4) {
    hash = ((hash << 5) - hash + data[i]! + data[i + 1]! + data[i + 2]!) | 0
  }
  return hash.toString(36)
}

function hexToBinary(hex: string): string {
  let binary = ''
  for (let i = 0; i < hex.length; i++) {
    binary += parseInt(hex[i]!, 16).toString(2).padStart(4, '0')
  }
  return binary
}
