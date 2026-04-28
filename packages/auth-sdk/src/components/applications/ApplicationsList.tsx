'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H2,
  Label,
  P,
  Skeleton,
  Spinner,
  Switch,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useState } from 'react'
import type { Application } from '../../core/types.js'
import { useMyApplications, useRevokeApplication } from '../../react/applications.js'
import { ApplicationCard } from './ApplicationCard.js'
import { CreateApplicationModal } from './CreateApplicationModal.js'
import type { ApplicationsFlowTexts } from './types.js'
import { defaultApplicationsFlowTexts } from './types.js'

export interface ApplicationsListProps {
  /** Locale for date formatting (default `'en'`). */
  locale?: string
  /** Partial texts override — falls back to English defaults. */
  texts?: Partial<ApplicationsFlowTexts>
  /** Invoked when a card's "Manage" button is clicked. Consumer routes to the detail view. */
  onSelectApplication?: (app: Application) => void
  /** Extra content displayed on the right of the header (e.g. billing CTA). */
  headerActions?: React.ReactNode
  /** Show the "include archived" toggle. Default `true`. */
  showArchivedToggle?: boolean
  /** Show the "all applications (superadmin)" toggle. Default `false`. */
  showSuperadminAllToggle?: boolean
  /** Override className on root Card. */
  className?: string
  /** Optional map of `applicationId → key count` to display on each card. */
  keyCounts?: Record<string, number>
  /**
   * Server-side pre-fetched applications (via `getServerApplications()` from
   * `@ezstart/auth-sdk/server`). When provided, the React Query cache is
   * seeded so the very first paint already shows the list — no client
   * `<Spinner>` flash. React Query still revalidates in the background.
   *
   * NOTE: only applies to the default toggle state (no archived, not all).
   * Switching toggles re-fetches normally.
   */
  initialApplications?: Application[]
}

function mergeTexts(partial?: Partial<ApplicationsFlowTexts>): ApplicationsFlowTexts {
  if (!partial) return defaultApplicationsFlowTexts
  return {
    list: { ...defaultApplicationsFlowTexts.list, ...partial.list },
    card: { ...defaultApplicationsFlowTexts.card, ...partial.card },
    create: { ...defaultApplicationsFlowTexts.create, ...partial.create },
    detail: { ...defaultApplicationsFlowTexts.detail, ...partial.detail },
  }
}

export function ApplicationsList({
  locale = 'en',
  texts: partialTexts,
  onSelectApplication,
  headerActions,
  showArchivedToggle = true,
  showSuperadminAllToggle = false,
  className,
  keyCounts,
  initialApplications,
}: ApplicationsListProps) {
  const texts = mergeTexts(partialTexts)

  const [includeArchived, setIncludeArchived] = useState(false)
  const [all, setAll] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  // Only seed the cache while the toggles match the default state used by
  // the SSR helper (no archived, not all). Switching either toggle changes
  // the query key so the seed naturally falls off and a fresh fetch runs.
  const canSeed = initialApplications && !includeArchived && !all

  const {
    data: applications = [],
    isLoading,
    isError,
    refetch,
  } = useMyApplications(true, {
    includeArchived,
    all,
    initialData: canSeed ? initialApplications : undefined,
  })

  const revokeMutation = useRevokeApplication({
    onSuccess: () => {
      toast.success(texts.card.archiveSuccess)
    },
    onError: () => {
      toast.error(texts.card.archiveFailed)
    },
  })

  const handleArchive = async (app: Application) => {
    await revokeMutation.mutateAsync({ id: app.id })
  }

  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <Div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <Div className="space-y-1">
            <CardTitle>
              <H2 size="h3">{texts.list.title}</H2>
            </CardTitle>
            <CardDescription>{texts.list.description}</CardDescription>
          </Div>
          <Div className="flex items-center gap-2">
            {headerActions}
            <Button onClick={() => setCreateOpen(true)}>{texts.list.newApplication}</Button>
          </Div>
        </Div>

        {(showArchivedToggle || showSuperadminAllToggle) && (
          <Div className="flex flex-wrap items-center gap-4 pt-2">
            {showArchivedToggle && (
              <Div className="flex items-center gap-2">
                <Switch
                  id="applications-show-archived"
                  checked={includeArchived}
                  onCheckedChange={setIncludeArchived}
                />
                <Label htmlFor="applications-show-archived">{texts.list.showArchived}</Label>
              </Div>
            )}
            {showSuperadminAllToggle && (
              <Div className="flex items-center gap-2">
                <Switch id="applications-show-all" checked={all} onCheckedChange={setAll} />
                <Label htmlFor="applications-show-all">{texts.list.showAll}</Label>
              </Div>
            )}
          </Div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading && (
          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </Div>
        )}

        {!isLoading && isError && (
          <Div
            role="alert"
            className="border border-destructive/30 bg-destructive/10 text-destructive-foreground rounded-md p-4 space-y-2"
          >
            <P className="font-medium text-destructive">{texts.list.errorTitle}</P>
            <P className="text-sm text-destructive/90">{texts.list.errorDescription}</P>
            <Div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {texts.list.retry}
              </Button>
            </Div>
          </Div>
        )}

        {!isLoading && !isError && applications.length === 0 && (
          <Div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <H2 size="h4">{texts.list.emptyTitle}</H2>
            <P className="text-muted-foreground max-w-md">{texts.list.emptyDescription}</P>
            <Button onClick={() => setCreateOpen(true)}>{texts.list.emptyCta}</Button>
          </Div>
        )}

        {!isLoading && !isError && applications.length > 0 && (
          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map(app => (
              <ApplicationCard
                key={app.id}
                application={app}
                keyCount={keyCounts?.[app.id]}
                locale={locale}
                texts={texts.card}
                onSelect={onSelectApplication}
                onArchive={handleArchive}
                isArchiving={revokeMutation.isPending}
              />
            ))}
          </Div>
        )}

        {revokeMutation.isPending && (
          <Div className="flex justify-center mt-4">
            <Spinner size="sm" />
          </Div>
        )}
      </CardContent>

      <CreateApplicationModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={app => {
          setCreateOpen(false)
          onSelectApplication?.(app)
        }}
        texts={texts.create}
      />
    </Card>
  )
}
