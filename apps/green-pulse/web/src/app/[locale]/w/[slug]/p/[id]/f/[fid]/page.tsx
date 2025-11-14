'use client'

import { FormFillingInterface } from '@/components/forms/FormFillingInterface'
import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { Card, Section, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { use } from 'react'

interface PageProps {
  params: Promise<{ slug: string; id: string; fid: string; locale: string }>
}

function FormFillingContent({ params }: PageProps): any {
  const { slug, id, fid } = use(params)

  return (
    <>
      <FormFillingInterface workspaceSlug={slug} projectId={id} formInstanceId={fid} />
    </>
  )
}

export default function FormFillingPage({ params }: PageProps) {
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
        <FormFillingContent params={params} />
      </RequireRole>
    </RequireAuth>
  )
}
