'use client'

import { WorkspacesList } from '@/components/forms/WorkspacesList'
import { Badge, Card, CardContent, CardHeader, H1, P, Section } from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'

// Dynamic import for CreateWorkspaceDialog (121 lines)
// Dialog is only shown when user clicks "Create Workspace" button
// Reduces initial bundle size
const CreateWorkspaceDialog = dynamic(() => import('@/components/forms/CreateWorkspaceDialog').then(mod => ({ default: mod.CreateWorkspaceDialog })), {
  loading: () => <div className="animate-pulse bg-muted rounded h-10 w-40" />,
})

export default function DashboardPage() {
  const t = useTranslations('forms.workspaces')

  return (
    <>
      <Section size={'xl'} className="mt-20">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <H1 size="h2">📋 {t('title')}</H1>
            <Badge variant="secondary" className="text-xs">
              🚧 Under Development
            </Badge>
          </div>
          <P className="text-muted-foreground">{t('description')}</P>
        </div>

        <CreateWorkspaceDialog />
      </Section>

      <Suspense fallback={<WorkspacesListSkeleton />}>
        <WorkspacesList />
      </Suspense>
    </>
  )
}

function WorkspacesListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 w-3/4 bg-muted rounded mb-2 animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-1/2 bg-muted rounded mb-2 animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
