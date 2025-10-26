'use client'

import { CreateWorkspaceDialog } from '@/components/forms/CreateWorkspaceDialog'
import { WorkspacesList } from '@/components/forms/WorkspacesList'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, H1, P, Section } from '@ezstart/ui/components'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const t = useTranslations('forms.workspaces')

  return (
    <ProtectedRoute>
      <Section size={'xl'} className="mt-20">
        <div>
          <H1 size="h2" className="mb-2">
            📋 {t('title')}
          </H1>
          <P className="text-muted-foreground">
            {t('description')}
          </P>
        </div>

        <CreateWorkspaceDialog />
      </Section>

      <Suspense fallback={<WorkspacesListSkeleton />}>
        <WorkspacesList />
      </Suspense>
    </ProtectedRoute>
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
