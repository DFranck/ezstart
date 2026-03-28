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

export interface ScanFeedback {
  opinion: 'agree' | 'disagree'
  comment?: string
  createdAt: Date
}

export type ReportStatus = 'open' | 'in-progress' | 'resolved'

export type ReportCategory =
  | 'wrong-ocr'
  | 'wrong-advice'
  | 'wrong-gem'
  | 'wrong-efficiency'
  | 'other'

export interface ScanReport {
  status: ReportStatus
  category: ReportCategory
  description: string
  resolution?: string
  createdAt: Date
  updatedAt: Date
}

export interface Scan {
  id: string
  gameType: GameType
  imageUrl: string
  /** Base64 JPEG thumbnail of the scanned area (compressed, ~50-100KB) */
  thumbnail?: string
  status: ScanStatus
  result?: ScanResult
  feedback?: ScanFeedback
  reports?: ScanReport[]
  /** Error message when scan fails */
  error?: string
  createdAt: Date
  updatedAt: Date
}
