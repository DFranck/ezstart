'use client'
import { useTranslations } from 'next-intl'

import { useProjectForms } from '@/hooks/useProjects'
import { Card, CardContent, H3, P, Badge } from '@ezstart/ui/components'
import Link from 'next/link'

interface FormInstancesListProps {
  projectId: string
  workspaceSlug: string
}

export function FormInstancesList({ projectId, workspaceSlug }: FormInstancesListProps) {
  const { data, isLoading, error } = useProjectForms(projectId)
  const t = useTranslations('forms.forms')

  if (isLoading) {
    return <div>Loading forms...</div>
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent>
          <P>Error loading forms: {error.message}</P>
        </CardContent>
      </Card>
    )
  }

  const forms = data?.data || []

  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <H3 size="h4" className="mb-2">
            {t('noForms')}
          </H3>
          <P className="text-muted-foreground mb-4">
            {t('noFormsDescription')}
          </P>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {forms.map((form: any) => (
        <Link
          key={form._id}
          href={`/w/${workspaceSlug}/p/${projectId}/f/${form._id}`}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <H3 size="h5">
                      📄 {form.formConfigId || 'Untitled Form'}
                    </H3>
                    <Badge variant="outline" size="sm">
                      {form.mode || 'manual'}
                    </Badge>
                  </div>
                  <P className="text-sm text-muted-foreground">
                    {Object.keys(form.fields || {}).length} field
                    {Object.keys(form.fields || {}).length !== 1 ? 's' : ''} filled
                  </P>
                </div>
                <Badge
                  variant={
                    form.status === 'submitted'
                      ? 'default'
                      : form.status === 'completed'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {form.status}
                </Badge>
              </div>

              {form.updatedAt && (
                <P className="text-xs text-muted-foreground mt-2">
                  Last updated {new Date(form.updatedAt).toLocaleString()}
                </P>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
