/**
 * OCR Parsers
 */

export type { GameParser } from './base-parser.js'
export { cleanText, extractNumbers, matchPattern, failedResult, successResult } from './base-parser.js'

// Game parsers
export { nikkeParser } from './nikke.js'
export { summonersWarParser } from './summoners-war.js'
export { summonersWarArtifactParser } from './summoners-war-artifact.js'
