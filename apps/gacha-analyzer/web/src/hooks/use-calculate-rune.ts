'use client'

import { useMutation } from '@tanstack/react-query'
import { callApi } from '@/config/api'
import type { StatType, RuneSet, RuneQuality, RuneSlot, RuneAnalysis } from '@gacha-analyzer/types'
import type { PlayerProfile } from '@gacha-analyzer/types'

// ---------------------------------------------------------------------------
// Input types (mirrors CalculateRuneBodySchema from the API)
// ---------------------------------------------------------------------------

export interface RuneStatInput {
  type: StatType
  value: number
}

export interface CalculateRuneInput {
  slot: RuneSlot
  set: RuneSet
  grade?: number
  quality?: RuneQuality
  level: number
  isAncient?: boolean
  mainStat: RuneStatInput
  substats: RuneStatInput[]
  innateStat?: RuneStatInput
  profile?: PlayerProfile
}

// ---------------------------------------------------------------------------
// Response types (mirrors what the API returns)
// ---------------------------------------------------------------------------

export interface GemSimulation {
  removeStat: StatType
  replaceStat: StatType
  markerPostGem: string
  reasoningPostGem: string[]
}

export interface CalculateRuneResult {
  analysis: RuneAnalysis
  markerResult: {
    marker: string
    reasoning: string[]
    comparisons: {
      stat: StatType
      value: number
      rareMax: number
      heroMax: number
      legendMax: number
      isAboveHeroMax: boolean
      isAboveRareMax: boolean
      ratioVsHeroMax: number
      ratioVsLegendMax: number
      rollEstimate: number
    }[]
    gemSimulation?: GemSimulation
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React Query mutation hook to call POST /api/rune/calculate.
 *
 * @example
 * ```ts
 * const { mutate, data, isPending, isError } = useCalculateRune()
 * mutate({ slot: 2, set: 'swift', level: 12, mainStat: { type: 'spd', value: 42 }, substats: [] })
 * ```
 */
export function useCalculateRune() {
  return useMutation<CalculateRuneResult, Error, CalculateRuneInput>({
    mutationFn: (runeData: CalculateRuneInput) =>
      callApi<CalculateRuneResult>('/rune/calculate', {
        method: 'POST',
        body: runeData,
      }),
  })
}
