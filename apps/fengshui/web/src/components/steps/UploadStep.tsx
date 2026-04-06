/* path: /components/steps/UploadStep.tsx */
'use client'

import { PlanUploader } from '@/components/PlanUploader'
import type { AiValidationResult, UploadStepData } from '@/types/bagua'
import { StepContent } from '@ezstart/ui/components'
import React, { useRef, useState } from 'react'

/**
 * UploadStep
 * - Dropzone takes all available space (no redundant header — tab already shows title)
 * - SVG floor plan placeholder as background in empty state
 * - Crop/edit functionality preserved when file is uploaded
 * - AI validation result stored in step data for downstream steps
 */
const UploadStep = (): React.JSX.Element => {
  // Track latest validation result to sync into step data
  const validationRef = useRef<AiValidationResult | null>(null)

  return (
    <StepContent stepId="upload">
      {(data: UploadStepData, updateData) => {
        const [isEditing, setIsEditing] = useState(false)

        return (
          <PlanUploader
            className="flex-1 flex flex-col min-h-0"
            onPlanUpload={(file, preview) => {
              updateData({
                ...data,
                file,
                preview,
                aiValidation: validationRef.current ?? undefined,
              })
            }}
            onEditingChange={setIsEditing}
            onValidationResult={result => {
              validationRef.current = result
              // Update step data with validation result
              updateData({
                ...data,
                aiValidation: result ?? undefined,
              })
            }}
          />
        )
      }}
    </StepContent>
  )
}

export default UploadStep
