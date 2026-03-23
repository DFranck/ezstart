import type { GameType } from './game'
import type { RuneData } from './rune'
import type { GearData } from './gear'
import type { RuneAnalysis } from './rune-data'

export type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed'

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
