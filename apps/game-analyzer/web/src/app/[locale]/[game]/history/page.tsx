'use client'

import { Button, Div, P, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import type { GameType, ScanStatus } from '@game-analyzer/types'
import { ScanCard } from '@/components/scan-card'
import { useScans } from '@/hooks/use-scans'

export default function GameHistoryPage() {
  const t = useTranslations()
  const params = useParams()
  const game = params.game as GameType
  const [statusFilter, setStatusFilter] = useState<ScanStatus | 'all'>('all')

  const { data: scans, isLoading } = useScans({
    gameType: game,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  return (
    <Div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <Div className="flex items-center justify-between mb-6">
        <Div>
          <P className="text-sm text-muted-foreground">{t(`games.${game}`)}</P>
        </Div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${game}/scan`}>{t('actions.back')}</Link>
        </Button>
      </Div>

      {/* Filters */}
      <Div className="flex gap-3 mb-6">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ScanStatus | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('history.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('history.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('status.pending')}</SelectItem>
            <SelectItem value="processing">{t('status.processing')}</SelectItem>
            <SelectItem value="completed">{t('status.completed')}</SelectItem>
            <SelectItem value="failed">{t('status.failed')}</SelectItem>
          </SelectContent>
        </Select>
      </Div>

      {/* Scan List */}
      {isLoading ? (
        <Div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </Div>
      ) : scans && scans.length > 0 ? (
        <Div className="space-y-3">
          {scans.map((scan) => (
            <ScanCard key={scan.id} scan={scan} />
          ))}
        </Div>
      ) : (
        <Div className="text-center py-12">
          <P className="text-muted-foreground mb-2">{t('history.empty')}</P>
          <P className="text-sm text-muted-foreground">{t('history.emptyDescription')}</P>
        </Div>
      )}
    </Div>
  )
}
