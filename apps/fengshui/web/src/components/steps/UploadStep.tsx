/* path: /components/steps/UploadStep.tsx */
'use client'

import { PlanUploader } from '@/components/PlanUploader'
import type { UploadStepData } from '@/types/bagua'
import { Icon, StepContent, useStepper } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useState } from 'react'

/**
 * UploadStep
 * - Mobile-first, compact header
 * - Responsive container (full width on mobile, clamps at sm/2xl)
 * - Minimal crop intent via optional uploaderOptions (no extra toolbars)
 */
const UploadStep = () => {
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
        const { nextStep } = useStepper()
        const [isEditing, setIsEditing] = useState(false)

        const hasUploadedContent = !!(data?.file || data?.preview) || isEditing

        return (
          <div className="mx-auto w-full max-w-2xl ">
            <div className={cn('mb-6 sm:mb-8', { hidden: hasUploadedContent })}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary grid place-items-center shadow-sm">
                  <Icon
                    name="lucide:Upload"
                    className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                    Étape 1 · Import de votre plan
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Ajoutez le plan de votre appartement ou maison.
                  </p>
                </div>
              </div>
            </div>

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
                // Passer automatiquement à l'étape suivante
                setTimeout(() => nextStep(), 100)
              }}
              onEditingChange={setIsEditing}
              // Optional minimal-crop intent (ignored if PlanUploader doesn't support it)
              {...uploaderOptions}
            />
          </div>
        )
      }}
    </StepContent>
  )
}

export default UploadStep
