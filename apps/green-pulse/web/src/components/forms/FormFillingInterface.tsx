'use client'

import { useState, useEffect } from 'react'
import { useFormInstance, useFormConfig } from '@/hooks/useForms'
import { H1, P, Badge, Button, Skeleton, SkeletonForm } from '@ezstart/ui/components'
import { WorkspaceBreadcrumbs } from './WorkspaceBreadcrumbs'
import { FormChatInterface } from './FormChatInterface'
import { FormPreview } from './FormPreview'
import { useUpdateFormInstance, useSubmitFormInstance } from '@/hooks/useForms'

interface FormFillingInterfaceProps {
  workspaceSlug: string
  projectId: string
  formInstanceId: string
}

export function FormFillingInterface({
  workspaceSlug,
  projectId,
  formInstanceId,
}: FormFillingInterfaceProps) {
  const { data: instanceData, isLoading: instanceLoading } = useFormInstance(formInstanceId)
  const instance = instanceData?.data

  const { data: configData, isLoading: configLoading } = useFormConfig(
    instance?.formConfigId || ''
  )
  const config = configData?.data

  const updateInstance = useUpdateFormInstance(formInstanceId)
  const submitInstance = useSubmitFormInstance(formInstanceId)

  const [extractedFields, setExtractedFields] = useState<Record<string, any>>({})

  useEffect(() => {
    if (instance?.fields) {
      setExtractedFields(instance.fields)
    }
  }, [instance?.fields])

  if (instanceLoading || configLoading) {
    return (
      <div className="h-screen flex">
        {/* Left side - Form preview skeleton */}
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-8 w-64" variant="shimmer" />
          <SkeletonForm fields={6} showButton variant="shimmer" />
        </div>
        {/* Right side - PDF preview skeleton */}
        <div className="w-1/2 border-l p-8">
          <Skeleton className="h-full w-full rounded-lg" variant="shimmer" />
        </div>
      </div>
    )
  }

  if (!instance || !config) {
    return <div className="p-8">Form not found</div>
  }

  const handleFieldsUpdate = (fields: Record<string, any>) => {
    setExtractedFields(fields)
    updateInstance.mutate({ fields })
  }

  const handleSubmit = async () => {
    if (window.confirm('Submit this form? You won\'t be able to edit it after submission.')) {
      await submitInstance.mutateAsync()
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <WorkspaceBreadcrumbs
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          projectName="Project"
          formId={formInstanceId}
          formName={config.name}
        />

        <div className="flex items-center justify-between mt-3">
          <div>
            <H1 size="h3" className="mb-1">
              {config.icon} {config.name}
            </H1>
            <P className="text-sm text-muted-foreground">{config.description}</P>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{instance.mode}</Badge>
            <Badge
              variant={
                instance.status === 'submitted'
                  ? 'default'
                  : instance.status === 'completed'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {instance.status}
            </Badge>
            {instance.status !== 'submitted' && (
              <Button
                onClick={handleSubmit}
                disabled={
                  submitInstance.isPending ||
                  Object.keys(extractedFields).length === 0
                }
              >
                {submitInstance.isPending ? 'Submitting...' : 'Submit Form'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Split Screen: Chat + Form Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Interface */}
        <div className="w-1/2 border-r flex flex-col">
          <FormChatInterface
            formConfig={config}
            formInstanceId={formInstanceId}
            extractedFields={extractedFields}
            onFieldsUpdate={handleFieldsUpdate}
            disabled={instance.status === 'submitted'}
          />
        </div>

        {/* Right: Form Preview */}
        <div className="w-1/2 overflow-y-auto">
          <FormPreview
            formConfig={config}
            extractedFields={extractedFields}
            onFieldsUpdate={handleFieldsUpdate}
            disabled={instance.status === 'submitted'}
          />
        </div>
      </div>
    </div>
  )
}
