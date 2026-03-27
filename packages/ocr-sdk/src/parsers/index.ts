/**
 * OCR Parsers — base utilities only (game-specific parsers live in their app)
 */

export type { GameParser } from './base-parser.js'
export { cleanText, extractNumbers, matchPattern, failedResult, successResult } from './base-parser.js'
