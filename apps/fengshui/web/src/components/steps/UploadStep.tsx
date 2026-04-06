/* path: /components/steps/UploadStep.tsx */
'use client'

import { PlanUploader } from '@/components/PlanUploader'
import type { UploadStepData } from '@/types/bagua'
import { StepContent } from '@ezstart/ui/components'
import React, { useEffect, useState } from 'react'

/**
 * UploadStep
 * - Dropzone takes all available space (no redundant header — tab already shows title)
 * - SVG floor plan placeholder as background in empty state
 * - Crop/edit functionality preserved when file is uploaded
 */
const UploadStep = (): React.JSX.Element => {
  const [editingState, setEditingState] = useState<{
    isEditing: boolean
    canApply: boolean
    applyHandler: () => Promise<void>
  } | null>(null)

  return (
    <StepContent stepId="upload">
      {(data: UploadStepData, updateData) => {
        const [isEditing, setIsEditing] = useState(false)

        // Sync editingState to stepData via useEffect to avoid re-render loop
        useEffect(() => {
          if (editingState) {
            updateData({
              ...data,
              _editingState: editingState,
            })
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [editingState])

        return (
          <PlanUploader
            className="flex-1 flex flex-col min-h-0"
            onPlanUpload={(file, preview, transformations) => {
              updateData({
                ...data,
                file,
                preview,
                transformations: transformations ?? {
                  rotation: 0,
                  scale: 1,
                  position: { x: 0, y: 0 },
                },
              })
            }}
            onEditingChange={setIsEditing}
            onEditingStateChange={setEditingState}
          />
        )
      }}
    </StepContent>
  )
}

export default UploadStep
