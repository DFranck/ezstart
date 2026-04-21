'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Div,
  P,
  Span,
} from '@ezstart/ui/components'
import { useState } from 'react'
import type { Application } from '../../core/types.js'
import type { ApplicationCardTexts } from './types.js'
import { defaultApplicationsFlowTexts } from './types.js'

export interface ApplicationCardProps {
  application: Application
  /** Optional key count to display in footer (typically fed by caller). */
  keyCount?: number
  /** Locale for date formatting (default `'en'`). */
  locale?: string
  /** Partial texts override — falls back to English defaults. */
  texts?: Partial<ApplicationCardTexts>
  /** Invoked when the user clicks "Manage". */
  onSelect?: (app: Application) => void
  /**
   * Invoked when the user confirms archive. Consumer owns the mutation.
   * If provided, the confirm button triggers this callback.
   */
  onArchive?: (app: Application) => void | Promise<void>
  /** Controls confirm-button loading state when consumer runs async archive. */
  isArchiving?: boolean
}

function mergeTexts(partial?: Partial<ApplicationCardTexts>): ApplicationCardTexts {
  if (!partial) return defaultApplicationsFlowTexts.card
  return { ...defaultApplicationsFlowTexts.card, ...partial }
}

function formatDate(isoDate: string, locale: string): string {
  try {
    return new Date(isoDate).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoDate
  }
}

export function ApplicationCard({
  application,
  keyCount,
  locale = 'en',
  texts: partialTexts,
  onSelect,
  onArchive,
  isArchiving = false,
}: ApplicationCardProps) {
  const texts = mergeTexts(partialTexts)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isArchived = application.status === 'archived'

  const handleArchiveConfirm = async () => {
    if (!onArchive) {
      setConfirmOpen(false)
      return
    }
    await onArchive(application)
    setConfirmOpen(false)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-2">
        <Div className="flex items-start justify-between gap-2">
          <Badge variant={isArchived ? 'secondary' : 'outline'} size="sm">
            {application.slug}
          </Badge>
          <Badge variant={isArchived ? 'secondary' : 'success'} size="xs">
            {isArchived ? texts.statusArchived : texts.statusActive}
          </Badge>
        </Div>
        <CardTitle className="text-lg">{application.name}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        {application.description && (
          <P className="text-sm text-muted-foreground line-clamp-2">{application.description}</P>
        )}
        <Div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
          <Span>
            {texts.createdLabel}: {formatDate(application.createdAt, locale)}
          </Span>
          {typeof keyCount === 'number' && (
            <Span>
              {keyCount} {texts.keysLabel}
            </Span>
          )}
        </Div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        {onArchive && !isArchived && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isArchiving}
          >
            {texts.archive}
          </Button>
        )}
        {onSelect && (
          <Button size="sm" onClick={() => onSelect(application)}>
            {texts.manage}
          </Button>
        )}
      </CardFooter>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.archiveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{texts.archiveConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>{texts.archiveCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={isArchiving}>
              {texts.archiveSubmit}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
