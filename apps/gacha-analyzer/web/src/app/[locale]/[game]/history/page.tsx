'use client'

import {
  Button,
  Div,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import type { GameType, ScanStatus } from '@gacha-analyzer/types'
import { ScanCard } from '@/components/scan-card'
import { useScans } from '@/hooks/use-scans'

const RUNE_SETS = [
  'violent',
  'swift',
  'will',
  'rage',
  'fatal',
  'despair',
  'blade',
  'focus',
  'guard',
  'endure',
  'shield',
  'revenge',
  'nemesis',
  'vampire',
  'energy',
  'destroy',
  'fight',
  'determination',
  'enhance',
  'accuracy',
  'tolerance',
  'cruel',
]

const PAGE_SIZE = 20

export default function GameHistoryPage() {
  const t = useTranslations()
  const params = useParams()
  const game = params.game as GameType

  const [statusFilter, setStatusFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [adviceFilter, setAdviceFilter] = useState('all')
  const [setFilter, setSetFilter] = useState('all')
  const [slotFilter, setSlotFilter] = useState('all')
  const [feedbackFilter, setFeedbackFilter] = useState('all')
  const [reportFilter, setReportFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Reset page when status filter changes (sent to API)
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const apiStatus = statusFilter !== 'all' ? (statusFilter as ScanStatus) : undefined

  const { scans, total, hasMore, isLoading } = useScans({
    gameType: game,
    status: apiStatus,
    page,
    pageSize: PAGE_SIZE,
  })

  const filteredScans = scans.filter(scan => {
    const data = scan.result?.data as Record<string, unknown> | undefined
    const analysis = scan.result?.analysis as Record<string, unknown> | undefined
    const advice = analysis?.progressiveAdvice as { action?: string } | undefined

    if (levelFilter !== 'all' && data?.level !== Number(levelFilter)) return false
    if (adviceFilter !== 'all' && advice?.action !== adviceFilter) return false
    if (setFilter !== 'all' && data?.set !== setFilter) return false
    if (slotFilter !== 'all' && data?.slot !== Number(slotFilter)) return false
    if (feedbackFilter === 'agree' && scan.feedback?.opinion !== 'agree') return false
    if (feedbackFilter === 'disagree' && scan.feedback?.opinion !== 'disagree') return false
    if (feedbackFilter === 'none' && scan.feedback) return false

    if (reportFilter === 'hasReports' && (!scan.reports || scan.reports.length === 0)) return false
    if (
      reportFilter === 'openReports' &&
      (!scan.reports || !scan.reports.some(r => r.status === 'open'))
    )
      return false
    if (reportFilter === 'noReports' && scan.reports && scan.reports.length > 0) return false

    return true
  })

  const hasClientFilters =
    levelFilter !== 'all' ||
    adviceFilter !== 'all' ||
    setFilter !== 'all' ||
    slotFilter !== 'all' ||
    feedbackFilter !== 'all' ||
    reportFilter !== 'all'
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

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
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
            <SelectItem value="all">{t('history.allLevels')}</SelectItem>
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
            <SelectItem value="all">{t('history.allAdvice')}</SelectItem>
            <SelectItem value="sell">{t('history.sell')}</SelectItem>
            <SelectItem value="upgrade">{t('history.upgrade')}</SelectItem>
            <SelectItem value="keep">{t('history.keep')}</SelectItem>
            <SelectItem value="grind">{t('history.grind')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={setFilter} onValueChange={setSetFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Set" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('history.allSets')}</SelectItem>
            {RUNE_SETS.map(s => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={slotFilter} onValueChange={setSlotFilter}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Slot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('history.allSlots')}</SelectItem>
            {[1, 2, 3, 4, 5, 6].map(s => (
              <SelectItem key={s} value={String(s)}>
                {t('history.slot', { number: String(s) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t('feedback.title')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('feedback.all')}</SelectItem>
            <SelectItem value="agree">👍 {t('feedback.agree')}</SelectItem>
            <SelectItem value="disagree">👎 {t('feedback.disagree')}</SelectItem>
            <SelectItem value="none">{t('feedback.noFeedback')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={reportFilter} onValueChange={setReportFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('report.title')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('report.filter.all')}</SelectItem>
            <SelectItem value="hasReports">{t('report.filter.hasReports')}</SelectItem>
            <SelectItem value="openReports">{t('report.filter.openReports')}</SelectItem>
            <SelectItem value="noReports">{t('report.filter.noReports')}</SelectItem>
          </SelectContent>
        </Select>
      </Div>

      {/* Results count */}
      {!isLoading && total > 0 && (
        <P className="text-xs text-muted-foreground mb-3">
          {hasClientFilters
            ? `${filteredScans.length} / ${scans.length} runes (page ${page}/${totalPages}, ${total} total)`
            : `${rangeStart}-${rangeEnd} sur ${total} runes`}
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
          {filteredScans.map(scan => (
            <ScanCard key={scan.id} scan={scan} />
          ))}
        </Div>
      ) : (
        <Div className="text-center py-12">
          <P className="text-muted-foreground mb-2">{t('history.empty')}</P>
          <P className="text-sm text-muted-foreground">{t('history.emptyDescription')}</P>
        </Div>
      )}

      {/* Pagination */}
      {!isLoading && total > PAGE_SIZE && (
        <Div className="flex items-center justify-between mt-4">
          <P className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </P>
          <Div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              {t('actions.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage(p => p + 1)}
            >
              {t('actions.next')}
            </Button>
          </Div>
        </Div>
      )}
    </Div>
  )
}
