'use client'

import { FormInstancesList } from '@/components/forms/FormInstancesList'
import { ProjectDetails } from '@/components/forms/ProjectDetails'
import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { Card, CardContent, Div, H1, P, Section, Spinner } from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Suspense, use } from 'react'

// Dynamic import for CreateFormInstanceDialog (211 lines)
// Dialog is only shown when user clicks "Create Form" button
// Reduces initial bundle size
const CreateFormInstanceDialog = dynamic(
  () =>
    import('@/components/forms/CreateFormInstanceDialog').then(mod => ({
      default: mod.CreateFormInstanceDialog,
    })),
  {
    loading: () => <Div className="animate-pulse bg-muted rounded h-10 w-40" />,
  }
)

interface PageProps {
  params: Promise<{ slug: string; id: string; locale: string }>
}

function ProjectDetailContent({ params }: PageProps): any {
  const { slug, id } = use(params)
  const t = useTranslations('forms.projects')

  return (
    <>
      <Div className="container mx-auto py-8 px-4">
        <Suspense fallback={<Div className="h-6 w-64 bg-muted rounded mb-4 animate-pulse" />}>
          <ProjectDetails projectId={id} workspaceSlug={slug} />
        </Suspense>

        <Div className="flex items-center justify-between mb-6 mt-8">
          <Div>
            <H1 size="h3" className="mb-1">
              {t('formInstances')}
            </H1>
            <P className="text-sm text-muted-foreground">{t('formInstancesDescription')}</P>
          </Div>

          <CreateFormInstanceDialog projectId={id} workspaceSlug={slug} />
        </Div>

        <Suspense fallback={<FormsListSkeleton />}>
          <FormInstancesList projectId={id} workspaceSlug={slug} />
        </Suspense>
      </Div>
    </>
  )
}

function FormsListSkeleton() {
  return (
    <Div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-4">
            <Div className="h-5 w-1/3 bg-muted rounded mb-2 animate-pulse" />
            <Div className="h-4 w-full bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </Div>
  )
}

export default function ProjectDetailPage({ params }: PageProps) {
  const t = useTranslations('auth')

  return (
    <RequireAuth
      loadingComponent={
        <Section size="full">
          <Spinner size="lg" />
        </Section>
      }
      fallbackComponent={
        <Section size="full">
          <Card variant={'ghost'}>
            <AccessDenied>
              <LoginButton>{t('login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles={['client', 'beta-tester']}
        fallbackComponent={
          <Section size={'full'}>
            <Card variant={'ghost'}>
              <InsufficientPermissions requiredRoles={['client', 'beta-tester']} />
            </Card>
          </Section>
        }
      >
        <ProjectDetailContent params={params} />
      </RequireRole>
    </RequireAuth>
  )
}
