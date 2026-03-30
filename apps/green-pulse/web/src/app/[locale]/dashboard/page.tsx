'use client'

import { WorkspacesList } from '@/components/forms/WorkspacesList'
import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  P,
  Section,
  Spinner,
  WelcomeModal,
} from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'

// Dynamic import for CreateWorkspaceDialog (121 lines)
// Dialog is only shown when user clicks "Create Workspace" button
// Reduces initial bundle size
const CreateWorkspaceDialog = dynamic(
  () =>
    import('@/components/forms/CreateWorkspaceDialog').then(mod => ({
      default: mod.CreateWorkspaceDialog,
    })),
  {
    loading: () => <Div className="animate-pulse bg-muted rounded h-10 w-40" />,
  }
)

function DashboardContent() {
  const t = useTranslations('forms.workspaces')
  const tWelcome = useTranslations('forms.welcome')

  return (
    <>
      <WelcomeModal
        appName="GreenPulse"
        title={tWelcome('title')}
        description={tWelcome('description')}
        features={[
          {
            icon: 'lucide:Zap',
            title: tWelcome('features.createForms.title'),
            description: tWelcome('features.createForms.description'),
          },
          {
            icon: 'lucide:Workspace',
            title: tWelcome('features.workspaces.title'),
            description: tWelcome('features.workspaces.description'),
          },
          {
            icon: 'lucide:FileCheck',
            title: tWelcome('features.validation.title'),
            description: tWelcome('features.validation.description'),
          },
          {
            icon: 'lucide:Users',
            title: tWelcome('features.collaborate.title'),
            description: tWelcome('features.collaborate.description'),
          },
        ]}
        ctaText={tWelcome('cta')}
      />

      <Section size={'xl'} className="mt-20">
        <Div>
          <Div className="flex items-center gap-3 mb-2">
            <H1 size="h2">📋 {t('title')}</H1>
            <Badge variant="secondary" className="text-xs">
              {t('underDevelopment')}
            </Badge>
          </Div>
          <P className="text-muted-foreground">{t('description')}</P>
        </Div>

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
    <Div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader>
            <Div className="h-6 w-3/4 bg-muted rounded mb-2 animate-pulse" />
            <Div className="h-4 w-full bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <Div className="h-4 w-1/2 bg-muted rounded mb-2 animate-pulse" />
            <Div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </Div>
  )
}

export default function DashboardPage() {
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
        <DashboardContent />
      </RequireRole>
    </RequireAuth>
  )
}
