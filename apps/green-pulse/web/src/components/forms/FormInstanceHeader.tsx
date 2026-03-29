'use client'

import { Badge, Div, H1, P } from '@ezstart/ui/components'
import { WorkspaceBreadcrumbs } from './WorkspaceBreadcrumbs'
import { useFormInstance } from '@/hooks/useForms'
import { useTranslations } from 'next-intl'

interface FormInstanceHeaderProps {
  formInstanceId: string
  workspaceSlug: string
  projectId: string
}

export function FormInstanceHeader({
  formInstanceId,
  workspaceSlug,
  projectId,
}: FormInstanceHeaderProps) {
  const t = useTranslations('forms.forms')
  const { data: formInstance, isLoading } = useFormInstance(formInstanceId)

  if (isLoading) {
    return (
      <Div>
        <Div className="h-6 w-96 bg-muted rounded mb-2 animate-pulse" />
        <Div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </Div>
    )
  }

  if (!formInstance) {
    return (
      <Div>
        <H1 size="h3" className="text-destructive">
          {t('formNotFound')}
        </H1>
      </Div>
    )
  }

  const getStatusBadge = () => {
    const status = formInstance?.data?.status
    if (!status) return null

    if (status === 'draft') {
      return <Badge variant="secondary">{t('draft')}</Badge>
    } else if (status === 'in_progress') {
      return <Badge variant="default">{t('inProgress')}</Badge>
    } else if (status === 'submitted') {
      return <Badge variant="default">{t('submitted')}</Badge>
    } else if (status === 'archived') {
      return <Badge variant="outline">{t('archived')}</Badge>
    }
    return null
  }

  return (
    <Div>
      <WorkspaceBreadcrumbs
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        formId={formInstanceId}
      />

      <Div className="flex items-center justify-between mt-4">
        <Div>
          <Div className="flex items-center gap-3 mb-2">
            <H1 size="h3">{formInstance?.data?.formConfigId || 'Form'}</H1>
            {getStatusBadge()}
          </Div>
          <P className="text-sm text-muted-foreground">
            {formInstance?.data?.createdAt && (
              <>
                {t('created', { date: new Date(formInstance.data.createdAt).toLocaleDateString() })}
              </>
            )}
            {formInstance?.data?.submittedAt && (
              <>
                {' '}
                •{' '}
                {t('submittedAt', {
                  date: new Date(formInstance.data.submittedAt).toLocaleDateString(),
                })}
              </>
            )}
          </P>
        </Div>
      </Div>
    </Div>
  )
}
