import type { GameType } from './game'
import type { RuneData } from './rune'
import type { GearData } from './gear'

export type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ScanResult {
  success: boolean
  data: RuneData | GearData
  rawText: string
  confidence: number
  processingTimeMs: number
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
