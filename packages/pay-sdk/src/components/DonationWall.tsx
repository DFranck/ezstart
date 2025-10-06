'use client'

import { Card, CardContent, Icon } from '@ezstart/ui/components'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center gap-2 p-8 rounded-lg bg-destructive/10 border border-destructive/20">
          <Icon name="lucide:AlertCircle" className="w-5 h-5 text-destructive" />
          <p className="text-destructive font-medium">{t.errorText}: {error}</p>
        </div>
      </div>
    )
  }

  if (!donations.length) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
          <Icon name="lucide:Heart" className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-center">{t.noDonationsText}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Add keyframes for animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `
      }} />

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className || ''}`}>
        {donations.map((donation, index) => (
          <Card
            key={donation.id}
            className="group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: 'fadeInUp 0.6s ease-out forwards',
              opacity: 0
            }}
          >
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-pink-500/5 group-hover:via-purple-500/5 group-hover:to-blue-500/5 transition-all duration-500" />

          <CardContent className="p-6 relative">
            <div className="flex items-start gap-4 mb-3">
              {/* Avatar with gradient border */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 opacity-20 blur-sm" />
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {donation.isAnonymous ? (
                    <Icon name="lucide:User" className="w-6 h-6" />
                  ) : (
                    donation.customerName?.[0]?.toUpperCase() || '?'
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate">
                  {donation.isAnonymous ? t.anonymousLabel : donation.customerName || t.anonymousLabel}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className="font-semibold text-pink-600 dark:text-pink-400">
                    ${donation.amount}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(donation.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Heart icon */}
              <Icon
                name="lucide:Heart"
                className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform"
              />
            </div>

            {/* Message with quote styling */}
            {donation.metadata?.message && (
              <div className="relative mt-4 pl-4 border-l-2 border-pink-500/30">
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  &ldquo;{donation.metadata.message}&rdquo;
                </p>
              </div>
            )}

            {/* Project badge */}
            {!projectId && donation.projectName && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium">
                  <Icon name="lucide:Sparkles" className="w-3 h-3" />
                  {donation.projectName}
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
