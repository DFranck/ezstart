'use client'

import { useMemo } from 'react'
import { Badge, Card, CardContent, Div, Icon, P, Span } from '@ezstart/ui/components'
import { useDonations } from '../hooks/useDonations.js'
import { formatCurrency } from '../utils/format-currency.js'
import type { Payment } from '../types.js'

export interface DonationWallTexts {
  loadingText?: string
  errorText?: string
  noDonationsText?: string
  anonymousLabel?: string
  recentTitle?: string
  topTitle?: string
}

interface DonationWallProps {
  projectId?: string
  limit?: number
  className?: string
  texts?: DonationWallTexts
  // Legacy props for backward compatibility
  noDonationsText?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function TestimonialCard({
  donation,
  anonymousLabel,
  showProject,
}: {
  donation: Payment
  anonymousLabel: string
  showProject?: boolean
}) {
  const isAnonymous = donation.isAnonymous || !donation.customerName
  const name = isAnonymous ? anonymousLabel : donation.customerName!
  const message = donation.metadata?.message as string | undefined

  return (
    <Card className="min-w-[220px] max-w-[300px] flex-shrink-0">
      <CardContent className="p-4">
        <Div className="flex items-center gap-3 mb-2">
          {/* Avatar */}
          <Div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {isAnonymous ? (
              <Icon name="lucide:User" size={18} className="text-primary" />
            ) : (
              <Span className="text-sm font-bold text-primary">{getInitials(name)}</Span>
            )}
          </Div>
          {/* Name + amount + date */}
          <Div className="flex-1 min-w-0">
            <P className="font-semibold text-sm truncate">{name}</P>
            <Div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Span className="font-medium text-primary">
                {formatCurrency(donation.amount, donation.currency)}
              </Span>
              <Span>·</Span>
              <Span>{formatDate(donation.createdAt)}</Span>
            </Div>
          </Div>
        </Div>

        {/* Message */}
        {message && (
          <P size="sm" className="text-muted-foreground italic mt-2 line-clamp-2">
            &ldquo;{message}&rdquo;
          </P>
        )}

        {/* Project badge */}
        {showProject && donation.projectName && (
          <Div className="mt-2">
            <Badge variant="secondary" size="sm">
              {donation.projectName}
            </Badge>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}

export function DonationWall({
  projectId,
  limit = 20,
  className,
  texts,
  noDonationsText: legacyNoDonationsText,
}: DonationWallProps) {
  const { donations, isLoading, error } = useDonations({ projectId, limit })

  const t = {
    loadingText: texts?.loadingText || 'Loading donations...',
    errorText: texts?.errorText || 'Error',
    noDonationsText:
      texts?.noDonationsText ||
      legacyNoDonationsText ||
      'No donations yet. Be the first to support!',
    anonymousLabel: texts?.anonymousLabel || 'Anonymous',
    recentTitle: texts?.recentTitle || 'Recent supporters',
    topTitle: texts?.topTitle || 'Top supporters',
  }

  const { recentDonations, topDonations } = useMemo(() => {
    if (!donations?.length) return { recentDonations: [], topDonations: [] }

    // Last 5 most recent (already sorted by date from API)
    const recent = donations.slice(0, 5)

    // Top 3 biggest, deduped against recent
    const recentIds = new Set(recent.map(d => d.id))
    const sortedByAmount = [...donations].sort((a, b) => b.amount - a.amount)
    const top: Payment[] = []
    for (const d of sortedByAmount) {
      if (top.length >= 3) break
      if (!recentIds.has(d.id)) {
        top.push(d)
      }
    }

    return { recentDonations: recent, topDonations: top }
  }, [donations])

  const showProject = !projectId

  if (isLoading) {
    return (
      <Div className={className}>
        <Div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="min-w-[220px] max-w-[300px] flex-shrink-0 animate-pulse">
              <CardContent className="p-4">
                <Div className="flex items-center gap-3">
                  <Div className="w-10 h-10 rounded-full bg-muted" />
                  <Div className="flex-1 space-y-2">
                    <Div className="h-4 bg-muted rounded w-24" />
                    <Div className="h-3 bg-muted rounded w-32" />
                  </Div>
                </Div>
              </CardContent>
            </Card>
          ))}
        </Div>
      </Div>
    )
  }

  if (error) {
    return (
      <Div className={className}>
        <Div className="flex items-center justify-center gap-2 p-8 rounded-lg bg-destructive/10 border border-destructive/20">
          <Icon name="lucide:AlertCircle" className="w-5 h-5 text-destructive" />
          <P className="text-destructive font-medium">
            {t.errorText}: {error}
          </P>
        </Div>
      </Div>
    )
  }

  if (!donations?.length) {
    return (
      <Div className={className}>
        <Div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
          <Icon name="lucide:Heart" className="w-12 h-12 text-muted-foreground/40" />
          <P className="text-muted-foreground text-center">{t.noDonationsText}</P>
        </Div>
      </Div>
    )
  }

  return (
    <Div className={`space-y-6 ${className || ''}`}>
      {/* Recent supporters */}
      {recentDonations.length > 0 && (
        <Div>
          <P className="text-sm font-medium text-muted-foreground mb-3">{t.recentTitle}</P>
          <Div className="flex gap-3 overflow-x-auto pb-2">
            {recentDonations.map(donation => (
              <TestimonialCard
                key={donation.id}
                donation={donation}
                anonymousLabel={t.anonymousLabel}
                showProject={showProject}
              />
            ))}
          </Div>
        </Div>
      )}

      {/* Top supporters */}
      {topDonations.length > 0 && (
        <Div>
          <P className="text-sm font-medium text-muted-foreground mb-3">{t.topTitle}</P>
          <Div className="flex gap-3 overflow-x-auto pb-2">
            {topDonations.map(donation => (
              <TestimonialCard
                key={donation.id}
                donation={donation}
                anonymousLabel={t.anonymousLabel}
                showProject={showProject}
              />
            ))}
          </Div>
        </Div>
      )}
    </Div>
  )
}
