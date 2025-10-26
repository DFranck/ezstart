'use client'

import { H1, P, Badge } from '@ezstart/ui/components'
import { WorkspaceBreadcrumbs } from './WorkspaceBreadcrumbs'
import { useFormInstance } from '@/hooks/useForms'

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
  const { data: formInstance, isLoading } = useFormInstance(formInstanceId)

  if (isLoading) {
    return (
      <div>
        <div className="h-6 w-96 bg-muted rounded mb-2 animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!formInstance) {
    return (
      <div>
        <H1 size="h3" className="text-destructive">
          Form not found
        </H1>
      </div>
    )
  }

  const getStatusBadge = () => {
    const status = formInstance?.data?.status
    if (!status) return null

    if (status === 'draft') {
      return <Badge variant="secondary">Draft</Badge>
    } else if (status === 'in_progress') {
      return <Badge variant="default">In Progress</Badge>
    } else if (status === 'submitted') {
      return <Badge variant="default">Submitted</Badge>
    } else if (status === 'archived') {
      return <Badge variant="outline">Archived</Badge>
    }
    return null
  }

  return (
    <div>
      <WorkspaceBreadcrumbs
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        formId={formInstanceId}
      />

      <div className="flex items-center justify-between mt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <H1 size="h3">{formInstance?.data?.formConfigId || 'Form'}</H1>
            {getStatusBadge()}
          </div>
          <P className="text-sm text-muted-foreground">
            {formInstance?.data?.createdAt && (
              <>
                Created {new Date(formInstance.data.createdAt).toLocaleDateString()}
              </>
            )}
            {formInstance?.data?.submittedAt && (
              <>
                {' '}
                • Submitted {new Date(formInstance.data.submittedAt).toLocaleDateString()}
              </>
            )}
          </P>
        </div>
      </div>
    </div>
  )
}
