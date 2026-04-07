'use client'

import { useMemo } from 'react'
import { Div, Icon, P, Span } from '@ezstart/ui/components'
import { useDonations } from '../hooks/useDonations.js'
import { formatCurrency } from '../utils/format-currency.js'
import type { Payment } from '../types.js'

export interface DonationWallTexts {
  loadingText?: string
  errorText?: string
  noDonationsText?: string
  anonymousLabel?: string
}

interface DonationWallProps {
  projectId?: string
  limit?: number
  className?: string
  texts?: DonationWallTexts
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

function DonationPill({
  donation,
  anonymousLabel,
}: {
  donation: Payment
  anonymousLabel: string
}) {
  const isAnonymous = donation.isAnonymous || !donation.customerName
  const name = isAnonymous ? anonymousLabel : donation.customerName!

  return (
    <Div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card border shrink-0">
      <Div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
        {isAnonymous ? (
          <Icon name="lucide:User" size={14} className="text-primary" />
        ) : (
          <Span className="text-xs font-bold text-primary">{getInitials(name)}</Span>
        )}
      </Div>
      <Span className="text-sm font-medium whitespace-nowrap">{name}</Span>
      <Span className="text-sm font-bold text-primary whitespace-nowrap">
        {formatCurrency(donation.amount, donation.currency)}
      </Span>
      <Span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(donation.createdAt)}
      </Span>
    </Div>
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
  }

  const sortedDonations = useMemo(() => {
    if (!donations?.length) return []
    return [...donations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [donations])

  if (isLoading) {
    return (
      <Div className={`w-full max-w-full overflow-hidden ${className || ''}`}>
        <Div className="flex gap-3 w-max">
          {[...Array(6)].map((_, i) => (
            <Div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-card border shrink-0 animate-pulse"
            >
              <Div className="w-7 h-7 rounded-full bg-muted" />
              <Div className="h-4 bg-muted rounded w-16" />
              <Div className="h-4 bg-muted rounded w-12" />
              <Div className="h-3 bg-muted rounded w-10" />
            </Div>
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

  if (!sortedDonations.length) {
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
    <Div className={`w-full max-w-full overflow-x-auto scrollbar-hide ${className || ''}`}>
      <Div className="flex gap-3 w-max">
        {sortedDonations.map(donation => (
          <DonationPill
            key={donation.id}
            donation={donation}
            anonymousLabel={t.anonymousLabel}
          />
        ))}
      </Div>
    </Div>
  )
}
