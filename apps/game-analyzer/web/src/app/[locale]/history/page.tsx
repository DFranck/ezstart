'use client'

import { Button, Div, H1, P, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'
import type { GameType, ScanStatus } from '@game-analyzer/types'
import { ScanCard } from '@/components/scan-card'
import { useScans } from '@/hooks/use-scans'

export default function HistoryPage() {
  const t = useTranslations()
  const [gameFilter, setGameFilter] = useState<GameType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ScanStatus | 'all'>('all')

  const { data: scans, isLoading } = useScans({
    gameType: gameFilter === 'all' ? undefined : gameFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  return (
    <Div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <Div className="flex items-center justify-between mb-6">
        <H1 className="text-2xl font-bold">{t('history.title')}</H1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">{t('actions.back')}</Link>
        </Button>
      </Div>

      {/* Filters */}
      <Div className="flex gap-3 mb-6">
        <Select value={gameFilter} onValueChange={(v) => setGameFilter(v as GameType | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('history.filterByGame')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('history.allGames')}</SelectItem>
            <SelectItem value="summoners-war">{t('games.summoners-war')}</SelectItem>
            <SelectItem value="nikke">{t('games.nikke')}</SelectItem>
          </SelectContent>
        </Select>

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
