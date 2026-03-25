'use client'

import { Badge, Card, CardContent, CardHeader, Div, H3, P, Progress, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, BuildArchetype, ProgressiveAction, RollBreakdown } from '@game-analyzer/types'
import { BUILD_ARCHETYPES } from '@game-analyzer/types'
import { MonsterSuggestions } from './monster-suggestions'

// ── Set emojis ──
const SET_EMOJIS: Record<string, string> = {
  violent: '\u2694\uFE0F',
  swift: '\uD83D\uDCA8',
  rage: '\uD83D\uDD25',
  fatal: '\uD83D\uDDE1\uFE0F',
  despair: '\uD83D\uDE35',
  blade: '\uD83D\uDD2A',
  focus: '\uD83C\uDFAF',
  guard: '\uD83D\uDEE1\uFE0F',
  energy: '\uD83D\uDC9A',
  endure: '\uD83E\uDDF1',
  shield: '\uD83D\uDD30',
  revenge: '\u21A9\uFE0F',
  will: '\u2728',
  nemesis: '\u26A1',
  vampire: '\uD83E\uDDDB',
  destroy: '\uD83D\uDCA5',
  fight: '\u2694\uFE0F',
  determination: '\uD83D\uDCAA',
  enhance: '\uD83D\uDC9B',
  accuracy: '\uD83C\uDFAF',
  tolerance: '\uD83D\uDE4F',
  cruel: '\uD83D\uDE08',
}

// ── Quality badge styles (SW colors) ──
const QUALITY_BG: Record<RuneQuality, string> = {
  legend: 'bg-ga-roll-legend/10 border-ga-roll-legend/30 text-ga-roll-legend',
  hero: 'bg-ga-roll-hero/10 border-ga-roll-hero/30 text-ga-roll-hero',
  rare: 'bg-ga-roll-rare/10 border-ga-roll-rare/30 text-ga-roll-rare',
  magic: 'bg-ga-roll-magic/10 border-ga-roll-magic/30 text-ga-roll-magic',
  normal: 'bg-muted text-muted-foreground',
}

// ── Roll quality colors (SW quality system) ──
type RollQualityTier = 'legend' | 'hero' | 'rare' | 'magic' | 'normal'

const ROLL_QUALITY_COLORS: Record<RollQualityTier, string> = {
  legend: 'text-ga-roll-legend',
  hero: 'text-ga-roll-hero',
  rare: 'text-ga-roll-rare',
  magic: 'text-ga-roll-magic',
  normal: 'text-ga-roll-normal',
}

function getRollQualityTier(rollQuality: number): RollQualityTier {
  if (rollQuality >= 90) return 'legend'
  if (rollQuality >= 75) return 'hero'
  if (rollQuality >= 50) return 'rare'
  if (rollQuality >= 25) return 'magic'
  return 'normal'
}

function getRollQualityColor(rollQuality: number): string {
  return ROLL_QUALITY_COLORS[getRollQualityTier(rollQuality)]
}

function getRollQualityBarColor(rollQuality: number): string {
  if (rollQuality >= 90) return '[&>div]:bg-ga-roll-legend'
  if (rollQuality >= 75) return '[&>div]:bg-ga-roll-hero'
  if (rollQuality >= 50) return '[&>div]:bg-ga-roll-rare'
  if (rollQuality >= 25) return '[&>div]:bg-ga-roll-magic'
  return '[&>div]:bg-ga-roll-normal'
}

// ── Roll quality tier colors (bar) — SW quality system ──
function getRollQualityTierBarColor(tier: RuneQuality): string {
  switch (tier) {
    case 'legend': return '[&>div]:bg-ga-roll-legend'
    case 'hero': return '[&>div]:bg-ga-roll-hero'
    case 'rare': return '[&>div]:bg-ga-roll-rare'
    case 'magic': return '[&>div]:bg-ga-roll-magic'
    case 'normal': return '[&>div]:bg-ga-roll-normal'
  }
}

function getRollQualityTierTextColor(tier: RuneQuality): string {
  return ROLL_QUALITY_COLORS[tier] ?? ROLL_QUALITY_COLORS.normal
}

function formatStatValue(type: StatType, value: number): string {
  const percentStats: StatType[] = ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc']
  return percentStats.includes(type) ? `+${value}%` : `+${value}`
}

function formatStatLabel(type: StatType): string {
  return type.toUpperCase().replace('%', '%')
}

// ── Archetype emojis — sourced from BUILD_ARCHETYPES ──

// ── Progressive advice colors ──
const ADVICE_COLORS: Record<ProgressiveAction, string> = {
  sell: 'border-red-500/50 bg-red-500/10 text-red-400',
  upgrade: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  keep: 'border-green-500/50 bg-green-500/10 text-green-400',
  grind: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
}

const ADVICE_LABELS: Record<ProgressiveAction, string> = {
  sell: 'SELL',
  upgrade: 'UPGRADE',
  keep: 'KEEP',
  grind: 'GRIND',
}

const ROLL_TIER_BG: Record<RuneQuality, string> = {
  legend: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/30',
  hero: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/30',
  rare: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/30',
  magic: 'bg-ga-roll-magic/20 text-ga-roll-magic border-ga-roll-magic/30',
  normal: 'bg-muted text-muted-foreground border-border',
}

function isPercentStat(type: StatType): boolean {
  return ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc'].includes(type)
}

function formatRollValue(type: StatType, value: number): string {
  return isPercentStat(type) ? `${value}%` : `${value}`
}

// ── Synergy badge color by match count ──
function getSynergyBadgeClass(matchCount: number): string {
  if (matchCount >= 4) return 'bg-yellow-500/15 border-yellow-500/40 text-yellow-500'
  if (matchCount >= 3) return 'bg-green-500/15 border-green-500/40 text-green-500'
  return 'bg-muted border-border text-muted-foreground'
}

// ── Props ──
interface RuneCardProps {
  rune: RuneData
  analysis?: RuneAnalysis
  confidence?: number
}

export function RuneCard({ rune, analysis, confidence }: RuneCardProps) {
  const t = useTranslations('labels')
  const tRune = useTranslations('rune')

  const quality = rune.quality ?? 'normal'
  const gradeStars = Array.from({ length: rune.grade }, () => '\u2605').join('')
  const setEmoji = SET_EMOJIS[rune.set] ?? ''
  const rollQualityTier = analysis?.rollQualityTier ?? 'normal'
  const rollQualityPostGem = analysis?.rollQualityPostGem ?? 'normal'

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="pb-2 px-3 pt-3">
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-2">
            <P className="text-base">{setEmoji}</P>
            <H3 className="text-base font-bold capitalize">{rune.set}</H3>
            <Badge variant="outline" className="text-xs">Slot {rune.slot}</Badge>
          </Div>
          <Badge className={`border text-xs ${QUALITY_BG[quality]}`}>
            {tRune(`quality.${quality}`)}
          </Badge>
        </Div>
        <Div className="flex items-center gap-2">
          <P className="text-yellow-500 text-xs tracking-tighter leading-none">{gradeStars}</P>
          <Badge variant="secondary" className="text-xs">+{rune.level}</Badge>
        </Div>
      </CardHeader>

      <CardContent className="space-y-3 px-3 pb-3">
        {/* ── Main stat ── */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('mainStat')}</P>
          <Div className="flex items-center justify-between">
            <P className="text-sm font-semibold text-muted-foreground">
              {formatStatLabel(rune.mainStat.type)}
            </P>
            <P className="text-sm font-bold text-foreground">{formatStatValue(rune.mainStat.type, rune.mainStat.value)}</P>
          </Div>
        </Div>

        {/* ── Innate stat ── */}
        {rune.innateStat && (
          <Div>
            <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('innateStat')}</P>
            <Div className="flex items-center justify-between">
              <P className="text-sm text-muted-foreground">
                {formatStatLabel(rune.innateStat.type)}
              </P>
              <P className="text-sm font-medium text-foreground">{formatStatValue(rune.innateStat.type, rune.innateStat.value)}</P>
            </Div>
          </Div>
        )}

        {/* ── Separator ── */}
        <Div className="border-t border-border" />

        {/* ── Substats ── */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('subStats')}</P>
          <Div className="space-y-2">
            {rune.subStats.map((stat, i) => {
              const subAnalysis = analysis?.substats.find(s => s.type === stat.type)
              const breakdown = subAnalysis?.rollBreakdown
              return (
                <Div key={i} className="space-y-1">
                  <Div className="flex items-center justify-between text-sm">
                    <Div className="flex items-center gap-1.5">
                      <P className="font-medium text-muted-foreground">
                        {formatStatLabel(stat.type)}
                      </P>
                      {subAnalysis?.isGemTarget && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-yellow-500/40 bg-yellow-500/10 text-yellow-500">
                          {tRune('gemable')}
                        </Badge>
                      )}
                    </Div>
                    <Div className="flex items-center gap-2">
                      <P className={`font-semibold ${subAnalysis ? getRollQualityColor(subAnalysis.efficiency) : 'text-foreground'}`}>{formatStatValue(stat.type, stat.value)}</P>
                      {subAnalysis && (
                        <P className="text-xs">
                          <span className={getRollQualityColor(subAnalysis.efficiency)}>{tRune(`rollQuality.${getRollQualityTier(subAnalysis.efficiency)}`)}</span>
                          <span className="text-muted-foreground"> ({subAnalysis.rolls} {subAnalysis.rolls > 1 ? tRune('rolls') : tRune('roll')})</span>
                        </P>
                      )}
                    </Div>
                  </Div>
                  {/* Roll breakdown badges */}
                  {breakdown && breakdown.length > 0 && (
                    <Div className="flex items-center gap-1 pl-1">
                      {breakdown.map((roll, j) => (
                        <Badge key={j} variant="outline" className={`text-[10px] px-1.5 py-0 border ${ROLL_TIER_BG[roll.tier]}`}>
                          {formatRollValue(stat.type, roll.value)}
                        </Badge>
                      ))}
                    </Div>
                  )}
                  {subAnalysis && (
                    <Progress
                      value={subAnalysis.efficiency}
                      className={`h-1.5 ${getRollQualityBarColor(subAnalysis.efficiency)}`}
                    />
                  )}
                </Div>
              )
            })}
          </Div>
        </Div>

        {/* ── Roll Quality ── */}
        {analysis && (
          <>
            <Div className="border-t border-border" />
            <Div className="space-y-2">
              <Div className="flex items-center justify-between">
                <P className="text-sm font-medium">{tRune('rollQualityTitle')}</P>
                <Div className="flex items-center gap-2">
                  <P className={`text-lg font-bold ${getRollQualityTierTextColor(rollQualityTier)}`}>
                    {tRune(`rollQuality.${rollQualityTier}`)}
                  </P>
                  <P className={`text-sm ${getRollQualityTierTextColor(rollQualityTier)}`}>
                    ({analysis.rollQualityPercent}%)
                  </P>
                  {rollQualityPostGem !== rollQualityTier && (
                    <P className={`text-sm ${getRollQualityTierTextColor(rollQualityPostGem)}`}>
                      {'\u2192'} {tRune(`rollQuality.${rollQualityPostGem}`)}
                    </P>
                  )}
                </Div>
              </Div>
              <Progress
                value={analysis.rollQualityPercent}
                className={`h-2.5 ${getRollQualityTierBarColor(rollQualityTier)}`}
              />

              {/* After gem */}
              {rollQualityPostGem !== rollQualityTier && (
                <Div className="flex items-center justify-between text-sm">
                  <P className="text-muted-foreground">{tRune('afterGem')}</P>
                  <P className={`font-medium ${getRollQualityTierTextColor(rollQualityPostGem)}`}>
                    {tRune(`rollQuality.${rollQualityPostGem}`)} ({analysis.rollQualityPostGemPercent}%)
                  </P>
                </Div>
              )}

              {/* Potential at +12 */}
              {analysis.potentialEfficiency !== undefined && (
                <Div className="flex items-center justify-between text-sm">
                  <P className="text-muted-foreground">{tRune('potential12')}</P>
                  <P className="font-medium">{analysis.potentialEfficiency}%</P>
                </Div>
              )}

              {/* After grind */}
              {analysis.grindedEfficiency !== undefined && (
                <Div className="flex items-center justify-between text-sm">
                  <P className="text-muted-foreground">{tRune('afterGrind')}</P>
                  <Div className="flex items-center gap-1">
                    <P className="font-medium">{analysis.grindedEfficiency}%</P>
                    {analysis.grindGain !== undefined && analysis.grindGain > 0 && (
                      <P className="text-green-500 text-xs">(+{analysis.grindGain}%)</P>
                    )}
                  </Div>
                </Div>
              )}
            </Div>
          </>
        )}

        {/* ── Progressive Advice (Conseil) ── */}
        {analysis?.progressiveAdvice && (() => {
          const advice = analysis.progressiveAdvice
          return (
            <>
              <Div className="border-t border-border" />
              <Div className={`p-3 rounded-lg border-2 ${ADVICE_COLORS[advice.action]}`}>
                <Div className="flex items-center justify-between mb-1">
                  <P className="font-bold text-lg">{ADVICE_LABELS[advice.action]}</P>
                  {advice.sellProbability > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {advice.sellProbability}% sell risk
                    </Badge>
                  )}
                </Div>
                <P className="text-sm opacity-90">{advice.reason}</P>
                {advice.nextCheckAt > 0 && (
                  <P className="text-xs opacity-70 mt-1">Next check: +{advice.nextCheckAt}</P>
                )}
              </Div>
            </>
          )
        })()}

        {/* ── Synergy badges ── */}
        {analysis?.synergy && (() => {
          const matchingArchetypes = (analysis.synergy.allArchetypes ?? [])
            .filter(a => a.matchCount >= 3)
            .sort((a, b) => b.matchCount - a.matchCount)

          if (matchingArchetypes.length === 0 && analysis.synergy.synergyBonus < 0) {
            return (
              <>
                <Div className="border-t border-border" />
                <Div className="flex items-center justify-between">
                  <P className="text-sm font-medium">{tRune('synergy')}</P>
                  <P className="text-sm text-red-500">{tRune('noSynergy')} ({analysis.synergy.synergyBonus}%)</P>
                </Div>
              </>
            )
          }

          if (matchingArchetypes.length === 0) return null

          return (
            <>
              <Div className="border-t border-border" />
              <Div className="space-y-2">
                <P className="text-sm font-medium">{tRune('synergy')}</P>
                <Div className="flex flex-wrap gap-2">
                  {matchingArchetypes.map(arch => {
                    const archKey = arch.archetype as BuildArchetype
                    const desired = BUILD_ARCHETYPES[archKey]?.desiredStats ?? []
                    const matchedStats = arch.matchedStats ?? []
                    const emoji = BUILD_ARCHETYPES[archKey]?.emoji ?? ''
                    const bonus = arch.matchCount >= 4 ? '+8%' : arch.matchCount >= 3 ? '+4~8%' : '0%'
                    const statsDetail = desired
                      .map(s => `${matchedStats.includes(s) ? '\u2713' : '\u2717'} ${formatStatLabel(s)}`)
                      .join('  ')
                    const desc = BUILD_ARCHETYPES[archKey]?.description ?? ''
                    const tooltipText = `${tRune(`archetype.${archKey}`)} (${arch.matchCount}/4) ${bonus}\n${statsDetail}\n${desc}\n${tRune('synergyTooltip', { count: String(arch.matchCount), bonus })}`

                    return (
                      <Badge
                        key={archKey}
                        variant="outline"
                        className={`cursor-default text-[11px] px-1.5 py-0 ${getSynergyBadgeClass(arch.matchCount)}`}
                        title={tooltipText}
                      >
                        {emoji} {tRune(`archetype.${archKey}`)} {arch.matchCount}/4
                      </Badge>
                    )
                  })}
                </Div>
              </Div>
            </>
          )
        })()}

        {/* ── Monster suggestions ── */}
        {analysis?.synergy && (() => {
          const suggestedArchetypes = (analysis.synergy.allArchetypes ?? [])
            .filter(a => a.matchCount >= 3)
            .map(a => a.archetype)
          if (suggestedArchetypes.length === 0) return null
          return (
            <>
              <Div className="border-t border-border" />
              <MonsterSuggestions archetypes={suggestedArchetypes} />
            </>
          )
        })()}

        {/* ── Grind potential (compact) ── */}
        {analysis && analysis.substats.some(s => s.grindable && s.grindAmount) && (
          <>
            <Div className="border-t border-border" />
            <Div>
              <P className="text-xs font-medium text-muted-foreground uppercase mb-1.5">{tRune('grindPotential')}</P>
              <Div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {analysis.substats
                  .filter(s => s.grindable && s.grindAmount && s.grindAmount > 0)
                  .map((sub, i) => (
                    <P key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium">{formatStatLabel(sub.type)}</span>{' '}
                      {formatStatValue(sub.type, sub.value)}{'\u2192'}{formatStatValue(sub.type, sub.grindedValue!)}
                    </P>
                  ))}
              </Div>
            </Div>
          </>
        )}

        {/* ── Set bonus ── */}
        {analysis && (
          <>
            <Div className="border-t border-border" />
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tRune('setBonus')}</P>
              <P className="font-medium">
                {analysis.setBonus} ({analysis.setPieces} pcs)
              </P>
            </Div>
          </>
        )}

        {/* ── OCR Confidence (inline tooltip) ── */}
        {confidence !== undefined && (
          <Div className="flex justify-end pt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Div className="flex items-center gap-1 cursor-default">
                    <Div
                      className={`h-1.5 w-1.5 rounded-full ${
                        confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                    <P className="text-[10px] text-muted-foreground">{Math.round(confidence)}%</P>
                  </Div>
                </TooltipTrigger>
                <TooltipContent>
                  <P className="text-xs">{tRune('ocrConfidence')}: {Math.round(confidence)}%</P>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
