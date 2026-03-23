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

// Game parsers
export { nikkeParser } from './parsers/index.js'
export { summonersWarParser } from './parsers/index.js'

// Analyzers
export {
  analyzeRune,
  calculateEfficiency,
  calculatePotentialEfficiency,
  estimateRolls,
  getRecommendation,
} from './analyzers/index.js'
export type {
  EfficiencyTier,
  PlayerProfile,
  GrindPotential,
  Recommendation,
  RuneAnalysis,
  RuneEfficiencyResult,
  SubstatAnalysis,
  SubstatDetail,
} from './analyzers/index.js'
