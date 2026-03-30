'use client'

import { useState, useEffect } from 'react'
import { useFormInstance, useFormConfig } from '@/hooks/useForms'
import { Badge, Button, Div, H1, P, Skeleton, SkeletonForm } from '@ezstart/ui/components'
import { WorkspaceBreadcrumbs } from './WorkspaceBreadcrumbs'
import { FormChatInterface } from './FormChatInterface'
import { FormPreview } from './FormPreview'
import { useUpdateFormInstance, useSubmitFormInstance } from '@/hooks/useForms'
import type { FormConfig } from '@green-pulse/types'

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
  const instance = instanceData?.ok
    ? (instanceData.data as {
        formConfigId?: string
        mode?: string
        status?: string
        fields?: Record<string, unknown>
      })
    : undefined

  const { data: configData, isLoading: configLoading } = useFormConfig(instance?.formConfigId || '')
  const config = configData?.ok ? (configData.data as FormConfig) : undefined

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
      <Div className="h-screen flex">
        {/* Left side - Form preview skeleton */}
        <Div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-8 w-64" variant="shimmer" />
          <SkeletonForm fields={6} showButton variant="shimmer" />
        </Div>
        {/* Right side - PDF preview skeleton */}
        <Div className="w-1/2 border-l p-8">
          <Skeleton className="h-full w-full rounded-lg" variant="shimmer" />
        </Div>
      </Div>
    )
  }

  if (!instance || !config) {
    return <Div className="p-8">Form not found</Div>
  }

  const handleFieldsUpdate = (fields: Record<string, any>) => {
    setExtractedFields(fields)
    updateInstance.mutate({ fields })
  }

  const handleSubmit = async () => {
    if (window.confirm("Submit this form? You won't be able to edit it after submission.")) {
      await submitInstance.mutateAsync()
    }
  }

  return (
    <Div className="h-screen flex flex-col">
      {/* Header */}
      <Div className="border-b p-4 bg-background">
        <WorkspaceBreadcrumbs
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          projectName="Project"
          formId={formInstanceId}
          formName={config.name}
        />

        <Div className="flex items-center justify-between mt-3">
          <Div>
            <H1 size="h3" className="mb-1">
              {config.icon} {config.name}
            </H1>
            <P className="text-sm text-muted-foreground">{config.description}</P>
          </Div>
          <Div className="flex items-center gap-3">
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
                disabled={submitInstance.isPending || Object.keys(extractedFields).length === 0}
              >
                {submitInstance.isPending ? 'Submitting...' : 'Submit Form'}
              </Button>
            )}
          </Div>
        </Div>
      </Div>

      {/* Split Screen: Chat + Form Preview */}
      <Div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Chat Interface */}
        <Div className="w-full lg:w-1/2 min-h-[50vh] lg:min-h-0 border-b lg:border-b-0 lg:border-r flex flex-col overflow-y-auto">
          <FormChatInterface
            formConfig={config}
            formInstanceId={formInstanceId}
            extractedFields={extractedFields}
            onFieldsUpdate={handleFieldsUpdate}
            disabled={instance.status === 'submitted'}
          />
        </Div>

        {/* Right: Form Preview */}
        <Div className="w-full lg:w-1/2 min-h-[50vh] lg:min-h-0 overflow-y-auto">
          <FormPreview
            formConfig={config}
            extractedFields={extractedFields}
            onFieldsUpdate={handleFieldsUpdate}
            disabled={instance.status === 'submitted'}
          />
        </Div>
      </Div>
    </Div>
  )
}
