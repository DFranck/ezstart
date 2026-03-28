'use client'

import { Badge, Card, CardContent, CardHeader, Div, H3, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { GearData } from '@gacha-analyzer/types'
import { StatDisplay } from './stat-display'

interface GearCardProps {
  gear: GearData
  confidence?: number
}

export function GearCard({ gear, confidence }: GearCardProps) {
  const t = useTranslations('labels')

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-center justify-between">
          <H3 className="text-lg font-semibold capitalize">{gear.type}</H3>
          <Badge variant="outline">T{gear.tier}</Badge>
        </Div>
        <Div className="flex items-center gap-2">
          <P className="text-sm capitalize text-muted-foreground">{gear.manufacturer}</P>
          <P className="text-sm text-muted-foreground">+{gear.level}</P>
        </Div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main stat */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('mainStat')}</P>
          <StatDisplay label={gear.mainStat.type} value={`+${gear.mainStat.value}`} />
        </Div>

        {/* Sub stats */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('subStats')}</P>
          <Div className="space-y-1">
            {gear.subStats.map((stat, i) => (
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
