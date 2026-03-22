'use client'

import { Badge, Card, CardContent, CardHeader, Div, H3, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData } from '@game-analyzer/types'
import { StatDisplay } from './stat-display'

interface RuneCardProps {
  rune: RuneData
  confidence?: number
}

export function RuneCard({ rune, confidence }: RuneCardProps) {
  const t = useTranslations('labels')

  const gradeStars = Array.from({ length: rune.grade }, () => '★').join('')

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-center justify-between">
          <H3 className="text-lg font-semibold capitalize">{rune.set}</H3>
          <Badge variant="outline">Slot {rune.slot}</Badge>
        </Div>
        <Div className="flex items-center gap-2">
          <P className="text-yellow-500 text-lg">{gradeStars}</P>
          <P className="text-sm text-muted-foreground">+{rune.level}</P>
        </Div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main stat */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('mainStat')}</P>
          <StatDisplay label={rune.mainStat.type} value={`+${rune.mainStat.value}`} />
        </Div>

        {/* Innate stat */}
        {rune.innateStat && (
          <Div>
            <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('innateStat')}</P>
            <StatDisplay label={rune.innateStat.type} value={`+${rune.innateStat.value}`} />
          </Div>
        )}

        {/* Sub stats */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('subStats')}</P>
          <Div className="space-y-1">
            {rune.subStats.map((stat, i) => (
              <StatDisplay key={i} label={stat.type} value={`+${stat.value}`} />
            ))}
          </Div>
        </Div>

        {/* Confidence */}
        {confidence !== undefined && (
          <Div className="pt-2 border-t">
            <StatDisplay
              label={t('confidence')}
              value={`${Math.round(confidence * 100)}%`}
            />
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
