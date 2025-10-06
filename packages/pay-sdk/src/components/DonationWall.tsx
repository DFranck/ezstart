'use client'

import { Card, CardContent } from '@ezstart/ui/components'
import { useDonations } from '../hooks/useDonations.js'

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
  // Legacy props for backward compatibility
  noDonationsText?: string
}

export function DonationWall({
  projectId,
  limit = 10,
  className,
  texts,
  noDonationsText: legacyNoDonationsText
}: DonationWallProps) {
  const { donations, isLoading, error } = useDonations({ projectId, limit })

  // Merge texts with defaults
  const t = {
    loadingText: texts?.loadingText || 'Loading donations...',
    errorText: texts?.errorText || 'Error',
    noDonationsText: texts?.noDonationsText || legacyNoDonationsText || 'No donations yet. Be the first to support!',
    anonymousLabel: texts?.anonymousLabel || 'Anonymous',
  }

  if (isLoading) {
    return (
      <div className={className}>
        <p className="text-muted-foreground">{t.loadingText}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <p className="text-destructive">{t.errorText}: {error}</p>
      </div>
    )
  }

  if (!donations.length) {
    return (
      <div className={className}>
        <p className="text-muted-foreground">{t.noDonationsText}</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className || ''}`}>
      {donations.map(donation => (
        <Card key={donation.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                {donation.customerName?.[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{donation.customerName || t.anonymousLabel}</p>
                <p className="text-sm text-muted-foreground">
                  ${donation.amount} •{' '}
                  {new Date(donation.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {donation.metadata?.message && (
              <p className="text-sm text-muted-foreground italic mt-2">
                &ldquo;{donation.metadata.message}&rdquo;
              </p>
            )}
            {!projectId && donation.projectName && (
              <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                → {donation.projectName}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
