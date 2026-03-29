'use client'

import { ProjectsList } from '@/components/forms/ProjectsList'
import { WorkspaceBreadcrumbs } from '@/components/forms/WorkspaceBreadcrumbs'
import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { Card, CardContent, Div, H1, P, Section, Spinner } from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Suspense, use } from 'react'

// Dynamic import for CreateProjectDialog (153 lines)
// Dialog is only shown when user clicks "Create Project" button
// Reduces initial bundle size
const CreateProjectDialog = dynamic(
  () =>
    import('@/components/forms/CreateProjectDialog').then(mod => ({
      default: mod.CreateProjectDialog,
    })),
  {
    loading: () => <Div className="animate-pulse bg-muted rounded h-10 w-40" />,
  }
)

interface PageProps {
  params: Promise<{ slug: string; locale: string }>
}

function WorkspacePageContent({ params }: PageProps): any {
  const { slug } = use(params)
  const t = useTranslations('forms.projects')

  return (
    <>
      <Div className="container mx-auto py-8 px-4">
        <WorkspaceBreadcrumbs workspaceSlug={slug} />

        <Div className="flex items-center justify-between mb-8 mt-4">
          <Div>
            <H1 size="h2" className="mb-2">
              {t('title')}
            </H1>
            <P className="text-muted-foreground">{t('description')}</P>
          </Div>

          <CreateProjectDialog workspaceSlug={slug} />
        </Div>

        <Suspense fallback={<ProjectsListSkeleton />}>
          <ProjectsList workspaceSlug={slug} />
        </Suspense>
      </Div>
    </>
  )
}

function ProjectsListSkeleton() {
  return (
    <Div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <Div className="h-6 w-1/3 bg-muted rounded mb-2 animate-pulse" />
            <Div className="h-4 w-full bg-muted rounded mb-4 animate-pulse" />
            <Div className="flex gap-4">
              <Div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <Div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </Div>
          </CardContent>
        </Card>
      ))}
    </Div>
  )
}

export default function WorkspacePage({ params }: PageProps) {
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
        <WorkspacePageContent params={params} />
      </RequireRole>
    </RequireAuth>
  )
}
