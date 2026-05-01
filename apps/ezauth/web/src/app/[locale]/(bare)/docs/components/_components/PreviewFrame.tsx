'use client'

import { Card, CardContent, Div, Icon, P, Span, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { type ReactNode } from 'react'

interface PreviewFrameProps {
  /** The mounted demo node, or `null` if still loading. */
  demo: ReactNode | null
  /** True when the demo failed to import (no demo file). */
  demoError: boolean
  /** Fallback text shown when no demo is available. */
  fallbackText: string
}

/**
 * Wraps a live component demo in a card with a checkered background. Shows
 * a spinner while the demo is dynamically importing, and a friendly
 * fallback when the demo doesn't exist.
 */
export function PreviewFrame({ demo, demoError, fallbackText }: PreviewFrameProps) {
  const t = useTranslations('components')

  if (demoError) {
    return (
      <Card variant="default">
        <CardContent className="py-12">
          <Div className="text-center space-y-2">
            <P className="text-sm font-medium">{t('previewMissingTitle')}</P>
            <P className="text-xs text-muted-foreground">{fallbackText}</P>
          </Div>
        </CardContent>
      </Card>
    )
  }

  if (!demo) {
    return (
      <Card variant="default">
        <CardContent className="py-16">
          <Div className="flex justify-center" role="status" aria-busy="true">
            <Spinner variant="primary" size="lg" />
          </Div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="default" className="overflow-hidden relative">
      <CardContent className="relative bg-[linear-gradient(45deg,_var(--muted)_25%,_transparent_25%,_transparent_75%,_var(--muted)_75%,_var(--muted)),_linear-gradient(45deg,_var(--muted)_25%,_transparent_25%,_transparent_75%,_var(--muted)_75%,_var(--muted))] bg-[length:20px_20px] bg-[position:0_0,_10px_10px] p-6 md:p-10">
        <Div
          className="absolute top-3 left-3 z-10 max-w-[280px] space-y-0.5 rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-warning-foreground backdrop-blur-sm"
          role="note"
        >
          <Div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <Icon name="lucide:FlaskConical" className="h-3.5 w-3.5" />
            <Span>{t('demoModeBanner.title')}</Span>
          </Div>
          <P className="text-[11px] leading-snug text-warning-foreground/80">
            {t('demoModeBanner.description')}
          </P>
        </Div>
        <Div className="flex items-center justify-center min-h-[240px] pt-12">{demo}</Div>
      </CardContent>
    </Card>
  )
}
