/**
 * @ezstart/ocr-sdk
 *
 * OCR processing with Tesseract.js and extensible game parsers
 */

// Types
export type {
  BoundingBox,
  OcrRegion,
  OcrResult,
  OcrEngineConfig,
  ParsedResult,
  GameParser,
} from './types.js'

// Engine
export { recognize } from './engines/index.js'

// Parser utilities
export { cleanText, extractNumbers, matchPattern, failedResult, successResult } from './parsers/index.js'
