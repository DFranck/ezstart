'use client'
import { useTranslations } from 'next-intl'

import { useProjectForms } from '@/hooks/useProjects'
import { Badge, Card, CardContent, Div, H3, P, SkeletonCard } from '@ezstart/ui/components'
import Link from 'next/link'

interface FormInstancesListProps {
  projectId: string
  workspaceSlug: string
}

export function FormInstancesList({ projectId, workspaceSlug }: FormInstancesListProps) {
  const { data, isLoading, error } = useProjectForms(projectId)
  const t = useTranslations('forms.forms')

  if (isLoading) {
    return (
      <Div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard
            key={i}
            showHeader
            showFooter={false}
            lines={2}
            variant="shimmer"
            size="sm"
          />
        ))}
      </Div>
    )
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

  const forms = data ?? []

  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <H3 size="h4" className="mb-2">
            {t('noForms')}
          </H3>
          <P className="text-muted-foreground mb-4">{t('noFormsDescription')}</P>
        </CardContent>
      </Card>
    )
  }

  return (
    <Div className="space-y-3">
      {forms.map(form => (
        <Link key={form._id as string} href={`/w/${workspaceSlug}/p/${projectId}/f/${form._id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <Div className="flex items-start justify-between">
                <Div className="flex-1">
                  <Div className="flex items-center gap-2 mb-1">
                    <H3 size="h5">📄 {String(form.formConfigId || 'Untitled Form')}</H3>
                    <Badge variant="outline" size="sm">
                      {String(form.mode || 'manual')}
                    </Badge>
                  </Div>
                  <P className="text-sm text-muted-foreground">
                    {Object.keys((form.fields as Record<string, unknown>) || {}).length} field
                    {Object.keys((form.fields as Record<string, unknown>) || {}).length !== 1
                      ? 's'
                      : ''}{' '}
                    filled
                  </P>
                </Div>
                <Badge
                  variant={
                    form.status === 'submitted'
                      ? 'default'
                      : form.status === 'completed'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {String(form.status || 'draft')}
                </Badge>
              </Div>

              {typeof form.updatedAt === 'string' && (
                <P className="text-xs text-muted-foreground mt-2">
                  Last updated {new Date(form.updatedAt).toLocaleString()}
                </P>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </Div>
  )
}
