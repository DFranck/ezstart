'use client'

import { type ReactNode } from 'react'
import { Card, CardContent, Div, P, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

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
    <Card variant="default" className="overflow-hidden">
      <CardContent className="bg-[linear-gradient(45deg,_var(--muted)_25%,_transparent_25%,_transparent_75%,_var(--muted)_75%,_var(--muted)),_linear-gradient(45deg,_var(--muted)_25%,_transparent_25%,_transparent_75%,_var(--muted)_75%,_var(--muted))] bg-[length:20px_20px] bg-[position:0_0,_10px_10px] p-6 md:p-10">
        <Div className="flex items-center justify-center min-h-[200px]">{demo}</Div>
      </CardContent>
    </Card>
  )
}
