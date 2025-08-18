/* path: /components/steps/UploadStep.tsx */
'use client'

import { PlanUploader } from '@/components/PlanUploader'
import type { UploadStepData } from '@/types/bagua'
import { Icon, StepContent } from '@ezstart/ui/components'

const UploadStep = () => {
  return (
    <StepContent stepId="upload">
      {(data: UploadStepData, updateData) => (
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl grid place-items-center mr-4">
                <Icon name="lucide:Upload" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Étape 1 : Import de votre Plan</h2>
                <p className="text-gray-600">Uploadez le plan de votre appartement ou maison</p>
              </div>
            </div>

            <PlanUploader
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
            />
          </div>
        </div>
      )}
    </StepContent>
  )
}

export default UploadStep
