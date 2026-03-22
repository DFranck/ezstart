/**
 * @ezstart/ocr-sdk Types
 *
 * Core types for OCR processing and game-specific parsing
 */

/**
 * Bounding box coordinates for a detected text region
 */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * A single recognized text region with position and confidence
 */
export interface OcrRegion {
  text: string
  bbox: BoundingBox
  confidence: number
}

/**
 * Raw OCR result from the engine
 */
export interface OcrResult {
  text: string
  confidence: number
  regions: OcrRegion[]
}

/**
 * Configuration for the OCR engine
 */
export interface OcrEngineConfig {
  /** Tesseract language code (e.g. 'eng', 'fra') */
  language?: string
  /** Apply preprocessing to improve recognition */
  preprocessImage?: boolean
}

/**
 * Result returned by a game parser
 */
export interface ParsedResult {
  success: boolean
  data: Record<string, unknown>
  errors?: string[]
}

/**
 * Interface that all game-specific parsers must implement
 */
export interface GameParser {
  /** Identifier for the game this parser handles */
  gameName: string
  /** Parse raw OCR output into structured game data */
  parse(ocrResult: OcrResult): ParsedResult
}
