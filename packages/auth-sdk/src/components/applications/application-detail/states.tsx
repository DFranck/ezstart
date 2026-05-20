'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Skeleton,
} from '@ezstart/ui/components'
import type { ApplicationDetailViewTexts } from '../types.js'

/**
 * Skeleton card shown while the application detail query is loading.
 *
 * @internal
 */
export function ApplicationDetailLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
    </Card>
  )
}

interface ApplicationDetailErrorProps {
  texts: ApplicationDetailViewTexts
  onRetry: () => void
  onBack?: () => void
}

/**
 * Error card with retry + optional back CTA shown when the detail query
 * fails or returns no application.
 *
 * @internal
 */
export function ApplicationDetailError({ texts, onRetry, onBack }: ApplicationDetailErrorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{texts.errorTitle}</CardTitle>
        <CardDescription>{texts.errorDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {texts.retry}
          </Button>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              {texts.back}
            </Button>
          )}
        </Div>
      </CardContent>
    </Card>
  )
}
