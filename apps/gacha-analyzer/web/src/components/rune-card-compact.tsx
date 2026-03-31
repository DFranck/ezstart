'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Div,
  P,
  Span,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type {
  RuneData,
  RuneAnalysis,
  RuneQuality,
  ProgressiveAction,
  StatTier,
} from '@gacha-analyzer/types'
import { SetIcon } from './rune-card-utils'
import {
  SubstatsList,
  formatStatLabel,
  formatStatValue,
  getStatTier,
} from './rune-card-compact-substats'
import { NarrativeSummary } from './rune-card-compact-narrative'
import { DebugPanel } from './rune-card-compact-debug'

const QUALITY_COLORS: Record<RuneQuality, string> = {
  legend: 'text-ga-roll-legend',
  hero: 'text-ga-roll-hero',
  rare: 'text-ga-roll-rare',
  magic: 'text-ga-roll-magic',
  normal: 'text-muted-foreground',
}

const ADVICE_COLORS: Record<ProgressiveAction, string> = {
  sell: 'text-destructive-foreground',
  upgrade: 'text-ga-roll-rare',
  keep: 'text-success-foreground',
  grind: 'text-ga-roll-hero',
}

const ADVICE_BG: Record<ProgressiveAction, string> = {
  sell: 'bg-destructive/10 border-destructive/30',
  upgrade: 'bg-ga-roll-rare/10 border-ga-roll-rare/30',
  keep: 'bg-success/10 border-success/30',
  grind: 'bg-ga-roll-hero/10 border-ga-roll-hero/30',
}

const ADVICE_ICONS: Record<ProgressiveAction, string> = {
  upgrade: '\u2191',
  keep: '\u2713',
  grind: '\u2699',
  sell: '\u2715',
}

// Innate tier badge — S/A en innate = malus (stat gâchée, non grindable), D = stat morte
const INNATE_TIER_MALUS: Record<StatTier, string> = {
  S: 'bg-destructive/15 text-destructive border-destructive/40',
  A: 'bg-destructive/15 text-destructive border-destructive/40',
  B: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  C: 'bg-muted/30 text-muted-foreground border-border/40',
  D: 'bg-destructive/10 text-destructive border-destructive/30',
}

interface RuneCardCompactProps {
  rune: RuneData
  analysis?: RuneAnalysis
  confidence?: number
}

export function RuneCardCompact({ rune, analysis, confidence }: RuneCardCompactProps) {
  const tRune = useTranslations('rune')
  const [showDebug, setShowDebug] = useState(false)

  const quality = rune.quality ?? 'normal'
  const advice = analysis?.progressiveAdvice

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* Row 1: Set, Slot, Level, Quality | Roll Quality + Advice */}
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-1.5">
            <SetIcon set={rune.set} className="w-5 h-5" />
            <P className="text-sm font-bold capitalize">{rune.set}</P>
            <P className="text-xs text-muted-foreground">({rune.slot})</P>
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              +{rune.level}
            </Badge>
            <Badge
              className={`border text-[10px] px-1 py-0 ${
                quality === 'legend'
                  ? 'bg-ga-roll-legend/10 border-ga-roll-legend/30 text-ga-roll-legend'
                  : quality === 'hero'
                    ? 'bg-ga-roll-hero/10 border-ga-roll-hero/30 text-ga-roll-hero'
                    : quality === 'rare'
                      ? 'bg-ga-roll-rare/10 border-ga-roll-rare/30 text-ga-roll-rare'
                      : quality === 'magic'
                        ? 'bg-ga-roll-magic/10 border-ga-roll-magic/30 text-ga-roll-magic'
                        : 'bg-muted text-muted-foreground'
              }`}
            >
              {tRune(`quality.${quality}`)}
            </Badge>
            {rune.isAncient && (
              <Badge className="border text-[10px] px-1 py-0 bg-warning/20 text-warning border-warning/40">
                {tRune('ancient')}
              </Badge>
            )}
          </Div>
          {advice && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={`border text-[10px] px-1.5 py-0 font-bold ${ADVICE_BG[advice.action]} ${ADVICE_COLORS[advice.action]}`}
                  >
                    {ADVICE_ICONS[advice.action]} {advice.action.toUpperCase()}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <P className="text-xs font-medium">
                    {advice.reasonKey
                      ? tRune(`adviceReason.${advice.reasonKey}`, advice.reasonParams ?? {})
                      : advice.reason}
                  </P>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Div>

        {/* Row 2: Main stat */}
        <Div className="flex items-center gap-2">
          <P className="text-sm font-bold text-foreground">
            {formatStatLabel(rune.mainStat.type)}{' '}
            {formatStatValue(rune.mainStat.type, rune.mainStat.value)}
          </P>
          {rune.innateStat &&
            (() => {
              const innateTier = getStatTier(rune.set, rune.innateStat.type)
              const isInnateMalus = innateTier === 'S' || innateTier === 'A' || innateTier === 'D'
              return (
                <Div className="flex items-center gap-1">
                  <P className="text-xs text-muted-foreground">
                    ({formatStatLabel(rune.innateStat.type)}{' '}
                    {formatStatValue(rune.innateStat.type, rune.innateStat.value)})
                  </P>
                  <Badge
                    variant="outline"
                    className={`text-[7px] px-0.5 py-0 font-bold ${INNATE_TIER_MALUS[innateTier]}`}
                  >
                    {isInnateMalus && '\u26A0\uFE0F'}
                    {innateTier}
                  </Badge>
                </Div>
              )
            })()}
        </Div>

        {/* Separator */}
        <Div className="border-t border-border" />

        {/* Row 3: Substats with roll breakdown */}
        <SubstatsList rune={rune} analysis={analysis} />

        {/* Row 4: Potential + Grind (inline) */}
        {analysis && (
          <Div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {analysis.potentialEfficiency !== undefined && (
              <P>
                <Span className="font-medium">{tRune('potential12')}:</Span>{' '}
                {analysis.potentialEfficiency}%
              </P>
            )}
            {analysis.grindedEfficiency !== undefined && (
              <P>
                <Span className="font-medium">{tRune('afterGrind')}:</Span>{' '}
                {analysis.grindedEfficiency}%
                {analysis.grindGain !== undefined && analysis.grindGain > 0 && (
                  <Span className="text-success-foreground"> (+{analysis.grindGain}%)</Span>
                )}
              </P>
            )}
          </Div>
        )}

        {/* Narrative Summary */}
        {analysis && (
          <NarrativeSummary rune={rune} analysis={analysis} quality={quality} advice={advice} />
        )}

        {/* Debug Panel (expandable) */}
        {analysis && (
          <Div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-[9px] text-muted-foreground/50 h-auto py-0.5 px-1"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? '\u25BC Hide debug' : '\u25B6 Debug'}
            </Button>
            {showDebug && <DebugPanel rune={rune} analysis={analysis} quality={quality} />}
          </Div>
        )}

        {/* OCR Confidence */}
        {confidence !== undefined && (
          <Div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Div className="flex items-center gap-1 cursor-default">
                    <Div
                      className={`h-1.5 w-1.5 rounded-full ${
                        confidence >= 80
                          ? 'bg-success'
                          : confidence >= 50
                            ? 'bg-warning'
                            : 'bg-destructive'
                      }`}
                    />
                    <P className="text-[10px] text-muted-foreground">{Math.round(confidence)}%</P>
                  </Div>
                </TooltipTrigger>
                <TooltipContent>
                  <P className="text-xs">
                    {tRune('ocrConfidence')}: {Math.round(confidence)}%
                  </P>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
