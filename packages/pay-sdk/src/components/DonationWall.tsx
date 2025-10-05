'use client'

import { Card, CardContent } from '@ezstart/ui/components'
import { useDonations } from '../hooks/useDonations.js'

interface DonationWallProps {
  projectId?: string
  limit?: number
  className?: string
}

export function DonationWall({ projectId, limit = 10, className }: DonationWallProps) {
  const { donations, isLoading, error } = useDonations({ projectId, limit })

  if (isLoading) {
    return (
      <div className={className}>
        <p className="text-muted-foreground">Loading donations...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  if (!donations.length) {
    return (
      <div className={className}>
        <p className="text-muted-foreground">No donations yet. Be the first to support!</p>
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
                <p className="font-semibold">{donation.customerName || 'Anonymous'}</p>
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
