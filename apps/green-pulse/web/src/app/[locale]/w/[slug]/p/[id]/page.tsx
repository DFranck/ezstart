'use client'

import { CreateFormInstanceDialog } from '@/components/forms/CreateFormInstanceDialog'
import { FormInstancesList } from '@/components/forms/FormInstancesList'
import { ProjectDetails } from '@/components/forms/ProjectDetails'
import { Card, CardContent, H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { Suspense, use } from 'react'

interface PageProps {
  params: Promise<{ slug: string; id: string; locale: string }>
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { slug, id } = use(params)
  const t = useTranslations('forms.projects')

  return (
    <>
      <div className="container mx-auto py-8 px-4">
        <Suspense fallback={<div className="h-6 w-64 bg-muted rounded mb-4 animate-pulse" />}>
          <ProjectDetails projectId={id} workspaceSlug={slug} />
        </Suspense>

        <div className="flex items-center justify-between mb-6 mt-8">
          <div>
            <H1 size="h3" className="mb-1">
              {t('formInstances')}
            </H1>
            <P className="text-sm text-muted-foreground">{t('formInstancesDescription')}</P>
          </div>

          <CreateFormInstanceDialog projectId={id} workspaceSlug={slug} />
        </div>

        <Suspense fallback={<FormsListSkeleton />}>
          <FormInstancesList projectId={id} workspaceSlug={slug} />
        </Suspense>
      </div>
    </>
  )
}

function FormsListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-5 w-1/3 bg-muted rounded mb-2 animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
