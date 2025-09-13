/* path: /components/steps/CardinalPointsStep.tsx */
'use client'

import type { CardinalStepData, UploadStepData } from '@/types/bagua'
import { Icon, StepContent, useStepper, Button } from '@ezstart/ui/components'
import { useState } from 'react'

const CardinalPointsStep = () => {
  return (
    <StepContent stepId="cardinal-points">
      {(data: CardinalStepData, updateData) => {
        const { getStepData } = useStepper()
        const uploadData = (getStepData('upload') as UploadStepData) ?? {}

        if (!uploadData.file || !uploadData.preview) {
          return (
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
                <p className="text-red-700">
                  Aucun plan n&apos;a été uploadé. Veuillez retourner à l&apos;étape 1 pour uploader
                  un plan.
                </p>
              </div>
            </div>
          )
        }

        // rotationAngle = angle "écran" (0° = Est)
        const [rotationAngle, setRotationAngle] = useState<number>(data.rotationAngle ?? 0)

        const handleRotate = (newAngle: number) => {
          const norm = ((newAngle % 360) + 360) % 360
          setRotationAngle(norm)
          const bearingFromNorth = (norm + 90) % 360 // conversion Est→Nord
          updateData({ rotationAngle: norm, bearingFromNorth })
        }

        const resetRotation = () => {
          setRotationAngle(0)
          updateData({ rotationAngle: 0, bearingFromNorth: 90 }) // 0° Est → 90° depuis le Nord
        }

        const cardinalPoints = [
          { direction: 'N', angle: 0, label: 'Nord' },
          { direction: 'E', angle: 90, label: 'Est' },
          { direction: 'S', angle: 180, label: 'Sud' },
          { direction: 'O', angle: 270, label: 'Ouest' },
        ] as const

        return (
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-3 text-blue-700 mb-4">
                  <Icon name="lucide:Compass" className="w-6 h-6" />
                  <span className="text-xl font-bold">Étape 2 : Points Cardinaux</span>
                </div>
                <p className="text-gray-600">
                  Alignez le Nord de la boussole avec le Nord de votre plan. Utilisez les contrôles
                  pour faire tourner l&apos;orientation.
                </p>
              </div>
            </div>

            {/* Contrôles */}
            <div className="mb-8 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-3 text-blue-700 mb-4">
                  <Icon name="lucide:RotateCw" className="w-5 h-5" />
                  <span className="font-medium">Faites tourner l&apos;orientation</span>
                  <Button
                    onClick={resetRotation}
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                  >
                    <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                    <span>Reset</span>
                  </Button>
                </div>

                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-800">
                    {Math.round(rotationAngle)}°
                  </div>
                  <div className="text-sm text-gray-600">Angle (repère écran, 0° = Est)</div>
                </div>

                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Button
                    onClick={() => handleRotate(rotationAngle - 45)}
                    size="sm"
                    className="w-10 h-10 grid place-items-center bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg"
                    title="−45°"
                  >
                    <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleRotate(rotationAngle - 10)}
                    size="sm"
                    className="w-10 h-10 grid place-items-center bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg"
                    title="−10°"
                  >
                    <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleRotate(rotationAngle - 1)}
                    size="sm"
                    className="w-10 h-10 grid place-items-center bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-lg"
                    title="−1°"
                  >
                    <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                  </Button>

                  <div className="w-px h-8 bg-gray-300 mx-2" />

                  <Button
                    onClick={() => handleRotate(rotationAngle + 1)}
                    size="sm"
                    className="w-10 h-10 grid place-items-center bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg"
                    title="+1°"
                  >
                    <Icon name="lucide:RotateCw" className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleRotate(rotationAngle + 10)}
                    size="sm"
                    className="w-10 h-10 grid place-items-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg"
                    title="+10°"
                  >
                    <Icon name="lucide:RotateCw" className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleRotate(rotationAngle + 45)}
                    size="sm"
                    className="w-10 h-10 grid place-items-center bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-lg"
                    title="+45°"
                  >
                    <Icon name="lucide:RotateCw" className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-gray-600 text-sm text-center">
                  Votre plan reste fixe au centre. Alignez <strong>N</strong> avec le Nord de votre
                  plan.
                </p>
              </div>
            </div>

            {/* Roue */}
            <div className="relative flex justify-center items-center">
              <div className="relative w-[700px] h-[700px]">
                {/* Plan central - même taille que le crop */}
                <div className="absolute w-96 h-96 rounded-2xl border-4 border-white shadow-2xl overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <img
                    src={uploadData.preview}
                    alt="Plan uploadé"
                    className="w-full h-full object-contain bg-white"
                  />
                  <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center text-white p-4 text-center pointer-events-none">
                    <div className="text-2xl font-bold mb-1 drop-shadow-lg">Votre Plan</div>
                    <div className="text-sm opacity-90 drop-shadow-lg">Centre fixe</div>
                  </div>
                </div>

                {/* Points cardinaux */}
                {cardinalPoints.map(({ direction, angle, label }) => {
                  const totalAngle = (angle + rotationAngle) * (Math.PI / 180)
                  const radius = 280
                  const x = Math.cos(totalAngle) * radius
                  const y = Math.sin(totalAngle) * radius
                  return (
                    <div
                      key={direction}
                      className="absolute w-20 h-20 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-blue-500 to-blue-600"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                        zIndex: 5,
                      }}
                    >
                      <div className="h-full flex flex-col items-center justify-center text-white p-2 text-center">
                        <div className="text-xl font-bold">{direction}</div>
                        <div className="text-sm opacity-90">{label}</div>
                      </div>
                    </div>
                  )
                })}

                {/* Lignes */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 15 }}
                >
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(59,130,246,0.3)" />
                      <stop offset="100%" stopColor="rgba(59,130,246,0.1)" />
                    </linearGradient>
                  </defs>
                  {cardinalPoints.map(({ angle }) => {
                    const totalAngle = (angle + rotationAngle) * (Math.PI / 180)
                    const radius = 280
                    const x = Math.cos(totalAngle) * radius
                    const y = Math.sin(totalAngle) * radius
                    return (
                      <line
                        key={angle}
                        x1={350}
                        y1={350}
                        x2={350 + x}
                        y2={350 + y}
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                      />
                    )
                  })}
                </svg>

                {/* Cercle */}
                <div className="absolute w-[560px] h-[560px] rounded-full border-2 border-dashed border-gray-300 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        )
      }}
    </StepContent>
  )
}

export default CardinalPointsStep
