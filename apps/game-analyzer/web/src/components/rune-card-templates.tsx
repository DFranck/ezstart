'use client'

import type { RuneData, RuneAnalysis } from '@game-analyzer/types'
import { RuneCardCompact } from './rune-card-compact'
import { RuneCardDetailed } from './rune-card-detailed'
import { RuneCardGaming } from './rune-card-gaming'
import { RuneCardCompactSkeleton } from './rune-card-compact-skeleton'
import { RuneCardDetailedSkeleton } from './rune-card-detailed-skeleton'
import { RuneCardGamingSkeleton } from './rune-card-gaming-skeleton'

export type RuneCardTemplate = 'compact' | 'detailed' | 'gaming'

interface RuneCardWithTemplateProps {
  rune?: RuneData
  analysis?: RuneAnalysis
  confidence?: number
  template: RuneCardTemplate
  isLoading?: boolean
}

export function RuneCardWithTemplate({ rune, analysis, confidence, template, isLoading }: RuneCardWithTemplateProps) {
  if (isLoading || !rune) {
    switch (template) {
      case 'compact':
        return <RuneCardCompactSkeleton />
      case 'detailed':
        return <RuneCardDetailedSkeleton />
      case 'gaming':
        return <RuneCardGamingSkeleton />
    }
  }

  switch (template) {
    case 'compact':
      return <RuneCardCompact rune={rune} analysis={analysis} confidence={confidence} />
    case 'detailed':
      return <RuneCardDetailed rune={rune} analysis={analysis} confidence={confidence} />
    case 'gaming':
      return <RuneCardGaming rune={rune} analysis={analysis} confidence={confidence} />
    default:
      return <RuneCardCompact rune={rune} analysis={analysis} confidence={confidence} />
  }
}
