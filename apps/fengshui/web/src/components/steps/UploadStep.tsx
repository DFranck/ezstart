/* path: /components/steps/UploadStep.tsx */
'use client'

import { PlanUploader } from '@/components/PlanUploader'
import type { UploadStepData } from '@/types/bagua'
import { Icon, StepContent, useStepper } from '@ezstart/ui/components'

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
        
        return (
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-0 max-w-2xl">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 grid place-items-center shadow-sm">
                <Icon name="lucide:Upload" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  Étape 1 · Import de votre plan
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Ajoutez le plan de votre appartement ou maison.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur-sm shadow-sm p-4 sm:p-6 lg:p-8">
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
              // Optional minimal-crop intent (ignored if PlanUploader doesn't support it)
              {...uploaderOptions}
            />

            {/* Tiny status line (responsive + optional) */}
            {(data?.file || data?.preview) && (
              <div className="mt-4 text-xs sm:text-sm text-gray-600">
                {data.file ? (
                  <span className="inline-flex items-center gap-2">
                    <Icon name="lucide:File" className="w-4 h-4" />
                    <span className="truncate max-w-[16rem] sm:max-w-none">
                      {(data.file as File).name}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Icon name="lucide:Image" className="w-4 h-4" />
                    Aperçu chargé
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        )
      }}
    </StepContent>
  )
}

export default UploadStep
