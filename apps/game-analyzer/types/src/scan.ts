import type { GameType } from './game'
import type { RuneData } from './rune'
import type { GearData } from './gear'
import type { RuneAnalysis } from './rune-data'

export type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface OcrSource {
  name: string
  confidence: number
  rawText: string
  subsFound: number
  success: boolean
}

export interface ScanResult {
  success: boolean
  data: RuneData | GearData
  rawText: string
  confidence: number
  processingTimeMs: number
  /** Rune analysis data (only for Summoners War runes) */
  analysis?: RuneAnalysis
  /** True when fewer substats were detected than expected for the rune's quality/level */
  partial?: boolean
  /** True when Gemini fallback failed and Tesseract result is weak — stats may be inaccurate */
  unreliable?: boolean
  /** Details of each OCR source before merge */
  ocrSources?: OcrSource[]
  /** Bench mode results — all source × preset combinations */
  benchResults?: BenchRunResult[]
}

export interface BenchRunResult {
  source: string
  preset: string
  confidence: number
  subsCount: number
  rawText: string
  success: boolean
}

export interface Scan {
  id: string
  gameType: GameType
  imageUrl: string
  status: ScanStatus
  result?: ScanResult
  createdAt: Date
  updatedAt: Date
}
