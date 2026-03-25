'use client'

import type { RuneData, RuneAnalysis } from '@game-analyzer/types'
import { RuneCardCompact } from './rune-card-compact'
import { RuneCardDetailed } from './rune-card-detailed'
import { RuneCardGaming } from './rune-card-gaming'

export type RuneCardTemplate = 'compact' | 'detailed' | 'gaming'

interface RuneCardWithTemplateProps {
  rune: RuneData
  analysis?: RuneAnalysis
  confidence?: number
  template: RuneCardTemplate
}

export function RuneCardWithTemplate({ rune, analysis, confidence, template }: RuneCardWithTemplateProps) {
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
