'use client'

import { Button, Div, P, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import type { GameType } from '@game-analyzer/types'
import { ScanCard } from '@/components/scan-card'
import { useScans } from '@/hooks/use-scans'

const RUNE_SETS = [
  'violent', 'swift', 'will', 'rage', 'fatal', 'despair', 'blade', 'focus',
  'guard', 'endure', 'shield', 'revenge', 'nemesis', 'vampire', 'energy',
  'destroy', 'fight', 'determination', 'enhance', 'accuracy', 'tolerance', 'cruel',
]

export default function GameHistoryPage() {
  const t = useTranslations()
  const params = useParams()
  const game = params.game as GameType

  const [statusFilter, setStatusFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [adviceFilter, setAdviceFilter] = useState('all')
  const [setFilter, setSetFilter] = useState('all')
  const [slotFilter, setSlotFilter] = useState('all')

  const { data: scans, isLoading } = useScans({
    gameType: game,
    limit: 200,
  })

  const filteredScans = (scans ?? []).filter(scan => {
    const data = scan.result?.data as Record<string, unknown> | undefined
    const analysis = scan.result?.analysis as Record<string, unknown> | undefined
    const advice = analysis?.progressiveAdvice as { action?: string } | undefined

    if (statusFilter !== 'all' && scan.status !== statusFilter) return false
    if (levelFilter !== 'all' && data?.level !== Number(levelFilter)) return false
    if (adviceFilter !== 'all' && advice?.action !== adviceFilter) return false
    if (setFilter !== 'all' && data?.set !== setFilter) return false
    if (slotFilter !== 'all' && data?.slot !== Number(slotFilter)) return false

    return true
  })

  const isFiltered = statusFilter !== 'all' || levelFilter !== 'all' || adviceFilter !== 'all' || setFilter !== 'all' || slotFilter !== 'all'
  const totalCount = scans?.length ?? 0

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
      <Div className="flex flex-wrap gap-2 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('history.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('status.pending')}</SelectItem>
            <SelectItem value="processing">{t('status.processing')}</SelectItem>
            <SelectItem value="completed">{t('status.completed')}</SelectItem>
            <SelectItem value="failed">{t('status.failed')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All +</SelectItem>
            <SelectItem value="3">+3</SelectItem>
            <SelectItem value="6">+6</SelectItem>
            <SelectItem value="9">+9</SelectItem>
            <SelectItem value="12">+12</SelectItem>
            <SelectItem value="15">+15</SelectItem>
          </SelectContent>
        </Select>

        <Select value={adviceFilter} onValueChange={setAdviceFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Advice" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Advice</SelectItem>
            <SelectItem value="sell">SELL</SelectItem>
            <SelectItem value="upgrade">UPGRADE</SelectItem>
            <SelectItem value="keep">KEEP</SelectItem>
            <SelectItem value="grind">GRIND</SelectItem>
          </SelectContent>
        </Select>

        <Select value={setFilter} onValueChange={setSetFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Set" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sets</SelectItem>
            {RUNE_SETS.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={slotFilter} onValueChange={setSlotFilter}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Slot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Slots</SelectItem>
            {[1, 2, 3, 4, 5, 6].map(s => (
              <SelectItem key={s} value={String(s)}>Slot {s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Div>

      {/* Results count */}
      {!isLoading && scans && (
        <P className="text-xs text-muted-foreground mb-3">
          {isFiltered
            ? `${filteredScans.length} / ${totalCount} runes`
            : `${totalCount} runes`
          }
        </P>
      )}

      {/* Scan List */}
      {isLoading ? (
        <Div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </Div>
      ) : filteredScans.length > 0 ? (
        <Div className="space-y-3">
          {filteredScans.map((scan) => (
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
