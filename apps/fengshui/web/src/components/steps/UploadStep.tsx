/* path: /components/steps/UploadStep.tsx */
'use client'

import { PlanUploader } from '@/components/PlanUploader'
import type { UploadStepData } from '@/types/bagua'
import {
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  Icon,
  P,
  StepContent,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

/**
 * UploadStep
 * - Mobile-first, compact header
 * - Responsive container (full width on mobile, clamps at sm/2xl)
 * - Minimal crop intent via optional uploaderOptions (no extra toolbars)
 */
const UploadStep = () => {
  const t = useTranslations()

  // Optional: only if PlanUploader exposes such knobs.
  const uploaderOptions = {
    // keep UX minimal: just crop/confirm
    showGrid: false,
    showGuides: false,
    showToolbar: false,
    showRotate: false,
    showZoom: true, // pinch/scroll ok on mobile
    allowMove: true,
    enforceBoundary: true,
    // set a neutral default; Plan can be any ratio
    aspectRatio: undefined as number | undefined,
    // sensible min dimensions if you generate images later
    minWidth: 512,
    minHeight: 512,
  }

  return (
    <StepContent stepId="upload">
      {(data: UploadStepData, updateData) => {
        const [isEditing, setIsEditing] = useState(false)

        const hasUploadedContent = !!(data?.file || data?.preview) || isEditing
        const isReturningToStep = !!(data?.file || data?.preview) && !isEditing

        return (
          <>
            {/* Header initial - masqué pendant l'upload/crop */}
            <Card
              variant={'ghost'}
              className={cn('gap-2 max-w-lg mx-auto', {
                hidden: hasUploadedContent && !isReturningToStep,
              })}
            >
              <CardHeader className="flex items-center gap-2">
                <Div className="min-w-8 h-8 rounded-full flex items-center justify-center">
                  <Icon name="lucide:Upload" size={16} />
                </Div>
                <H2 size={'h5'} className="text-left">
                  {t('steps.upload.title')}
                </H2>
              </CardHeader>
              <CardContent className="">
                <P variant={'description'}>{t('steps.upload.description')}</P>
              </CardContent>
            </Card>

            <PlanUploader
              // ↓ Keep the API you already use; we just pass through data in a minimal shape
              onPlanUpload={(file, preview, transformations) => {
                updateData({
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
              onEditingStateChange={editingState => {
                // Store editing state in stepData for the stepper to access
                updateData({
                  ...data,
                  _editingState: editingState,
                })
              }}
              // Optional minimal-crop intent (ignored if PlanUploader doesn't support it)
              {...uploaderOptions}
            />
          </>
        )
      }}
    </StepContent>
  )
}

export default UploadStep
