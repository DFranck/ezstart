'use client'

import { Badge, Card, CardContent, CardHeader, Div, H3, P, Progress } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, BuildArchetype } from '@game-analyzer/types'
import { BUILD_ARCHETYPES } from '@game-analyzer/types'

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

// ── Quality badge styles ──
const QUALITY_BG: Record<RuneQuality, string> = {
  legend: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
  hero: 'bg-violet-500/10 border-violet-500/30 text-violet-500',
  rare: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  magic: 'bg-green-500/10 border-green-500/30 text-green-500',
  normal: 'bg-muted text-muted-foreground',
}

// ── Stat colors ──
const STAT_COLORS: Record<StatType, string> = {
  spd: 'text-blue-400',
  cr: 'text-red-400',
  cd: 'text-red-400',
  atk: 'text-orange-400',
  'atk%': 'text-orange-400',
  hp: 'text-green-400',
  'hp%': 'text-green-400',
  def: 'text-slate-400',
  'def%': 'text-slate-400',
  res: 'text-violet-400',
  acc: 'text-violet-400',
}

// ── Efficiency tier helpers ──
type Tier = 'sell' | 'keep' | 'good' | 'great' | 'godlike'

function getTierColor(tier: Tier): string {
  switch (tier) {
    case 'godlike': return 'text-yellow-500'
    case 'great': return 'text-green-500'
    case 'good': return 'text-blue-500'
    case 'keep': return 'text-orange-500'
    case 'sell': return 'text-red-500'
  }
}

function getProgressColor(tier: Tier): string {
  switch (tier) {
    case 'godlike': return '[&>div]:bg-yellow-500'
    case 'great': return '[&>div]:bg-green-500'
    case 'good': return '[&>div]:bg-blue-500'
    case 'keep': return '[&>div]:bg-orange-500'
    case 'sell': return '[&>div]:bg-red-500'
  }
}

function getSubstatBarColor(efficiency: number): string {
  if (efficiency >= 80) return '[&>div]:bg-green-500'
  if (efficiency >= 50) return '[&>div]:bg-yellow-500'
  return '[&>div]:bg-red-500'
}

function formatStatValue(type: StatType, value: number): string {
  const percentStats: StatType[] = ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc']
  return percentStats.includes(type) ? `+${value}%` : `+${value}`
}

function formatStatLabel(type: StatType): string {
  return type.toUpperCase().replace('%', '%')
}

// ── Archetype emojis ──
const ARCHETYPE_EMOJIS: Record<string, string> = {
  'speed-dps': '\u26A1',
  'bruiser': '\uD83D\uDCAA',
  'tank-support': '\uD83D\uDEE1\uFE0F',
  'cleave': '\uD83D\uDC80',
  'cc-debuffer': '\uD83C\uDFAF',
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
  const tScan = useTranslations('scan')
  const tRune = useTranslations('rune')

  const quality = rune.quality ?? 'normal'
  const gradeStars = Array.from({ length: rune.grade }, () => '\u2605').join('')
  const setEmoji = SET_EMOJIS[rune.set] ?? ''
  const tier = analysis ? (analysis.adjustedTier ?? analysis.tier) : undefined
  const levelStrictness = analysis?.levelStrictness ?? 0

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="pb-3">
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-2">
            <P className="text-xl">{setEmoji}</P>
            <H3 className="text-lg font-semibold capitalize">{rune.set}</H3>
          </Div>
          <Badge variant="outline">Slot {rune.slot}</Badge>
        </Div>
        <Div className="flex items-center gap-3">
          <P className="text-yellow-500 text-lg tracking-tight">{gradeStars}</P>
          <Badge variant="secondary">+{rune.level}</Badge>
          <Badge className={`border ${QUALITY_BG[quality]}`}>
            {tRune(`quality.${quality}`)}
          </Badge>
        </Div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Main stat ── */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('mainStat')}</P>
          <Div className="flex items-center justify-between">
            <P className={`text-sm font-semibold ${STAT_COLORS[rune.mainStat.type]}`}>
              {formatStatLabel(rune.mainStat.type)}
            </P>
            <P className="text-sm font-bold">{formatStatValue(rune.mainStat.type, rune.mainStat.value)}</P>
          </Div>
        </Div>

        {/* ── Innate stat ── */}
        {rune.innateStat && (
          <Div>
            <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('innateStat')}</P>
            <Div className="flex items-center justify-between">
              <P className={`text-sm ${STAT_COLORS[rune.innateStat.type]}`}>
                {formatStatLabel(rune.innateStat.type)}
              </P>
              <P className="text-sm font-medium">{formatStatValue(rune.innateStat.type, rune.innateStat.value)}</P>
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
              return (
                <Div key={i} className="space-y-1">
                  <Div className="flex items-center justify-between text-sm">
                    <P className={`font-medium ${STAT_COLORS[stat.type]}`}>
                      {formatStatLabel(stat.type)}
                    </P>
                    <Div className="flex items-center gap-2">
                      <P className="font-medium">{formatStatValue(stat.type, stat.value)}</P>
                      {subAnalysis && (
                        <P className="text-xs text-muted-foreground">
                          {subAnalysis.efficiency}% ({subAnalysis.rolls} {subAnalysis.rolls > 1 ? tRune('rolls') : tRune('roll')})
                        </P>
                      )}
                    </Div>
                  </Div>
                  {subAnalysis && (
                    <Progress
                      value={subAnalysis.efficiency}
                      className={`h-1.5 ${getSubstatBarColor(subAnalysis.efficiency)}`}
                    />
                  )}
                </Div>
              )
            })}
          </Div>
        </Div>

        {/* ── Efficiency section ── */}
        {analysis && tier && (
          <>
            <Div className="border-t border-border" />
            <Div className="space-y-2">
              <Div className="flex items-center justify-between">
                <P className="text-sm font-medium">{tScan('efficiency.title')}</P>
                <Div className="flex items-center gap-2">
                  <P className={`text-lg font-bold ${getTierColor(tier)}`}>{analysis.weightedEfficiency ?? analysis.efficiency}%</P>
                  <P className="text-xs text-muted-foreground">({analysis.efficiency}%)</P>
                  <P className={`text-sm font-semibold ${getTierColor(tier)}`}>
                    {tScan(`efficiency.${tier}`)}
                  </P>
                </Div>
              </Div>
              <Progress
                value={analysis.weightedEfficiency ?? analysis.efficiency}
                className={`h-2.5 ${getProgressColor(tier)}`}
              />
              {levelStrictness > 0 && (
                <P className="text-xs text-muted-foreground">
                  {tScan('efficiency.levelStrictness', { value: String(levelStrictness) })}
                </P>
              )}

              {/* Potential at +12 */}
              {analysis.maxEfficiency !== undefined && (
                <Div className="flex items-center justify-between text-sm">
                  <P className="text-muted-foreground">{tRune('potential12')}</P>
                  <P className="font-medium">{analysis.maxEfficiency}%</P>
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

        {/* ── Synergy badges ── */}
        {analysis?.synergy && (() => {
          const matchingArchetypes = (analysis.synergy.allArchetypes ?? [])
            .filter(a => a.matchCount >= 2)
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
                    const emoji = ARCHETYPE_EMOJIS[archKey] ?? ''
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
                        className={`cursor-default text-xs ${getSynergyBadgeClass(arch.matchCount)}`}
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

        {/* ── Grind potential ── */}
        {analysis && analysis.substats.some(s => s.grindable && s.grindAmount) && (
          <>
            <Div className="border-t border-border" />
            <Div>
              <P className="text-xs font-medium text-muted-foreground uppercase mb-2">{tRune('grindPotential')}</P>
              <Div className="space-y-1">
                {analysis.substats
                  .filter(s => s.grindable && s.grindAmount && s.grindAmount > 0)
                  .map((sub, i) => (
                    <Div key={i} className="flex items-center justify-between text-sm">
                      <P className={`${STAT_COLORS[sub.type]}`}>{formatStatLabel(sub.type)}</P>
                      <P className="text-muted-foreground">
                        {formatStatValue(sub.type, sub.value)} {'\u2192'} {formatStatValue(sub.type, sub.grindedValue!)}
                        <span className="text-xs ml-1">({tRune('legendGrind')} +{sub.grindAmount})</span>
                      </P>
                    </Div>
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

        {/* ── OCR Confidence ── */}
        {confidence !== undefined && (
          <>
            <Div className="border-t border-border" />
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tRune('ocrConfidence')}</P>
              <Div className="flex items-center gap-1.5">
                <Div
                  className={`h-2 w-2 rounded-full ${
                    confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
                <P className="text-xs font-medium">{Math.round(confidence)}%</P>
              </Div>
            </Div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
