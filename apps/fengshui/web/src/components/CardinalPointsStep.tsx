'use client'

import { FENGSHUI_SECTORS, FengShuiSector } from '@/lib/fengshui-data'
import { Icon, Button } from '@ezstart/ui/components'
import { useMemo, useState } from 'react'
import { RotationControls } from './RotationControls'

interface CardinalPointsStepProps {
  uploadedPlan: { file: File; preview: string }
  onNextStep: () => void
}

export function CardinalPointsStep({ uploadedPlan, onNextStep }: CardinalPointsStepProps) {
  const [rotationAngle, setRotationAngle] = useState(0)

  const handleRotate = (newAngle: number) => {
    setRotationAngle(newAngle)
  }

  const resetRotation = () => {
    setRotationAngle(0)
  }

  const handleSectorClick = (sector: FengShuiSector) => {
    // Optionnel : on peut stocker le secteur sélectionné si nécessaire
    console.log('Secteur sélectionné:', sector)
  }

  const handleNextStep = () => {
    onNextStep()
  }

  // Calculer les positions des cartes une seule fois pour optimiser les performances
  const cardPositions = useMemo(() => {
    return FENGSHUI_SECTORS.map((sector, index) => {
      const angle = (index * 45 + rotationAngle) * (Math.PI / 180)
      const radius = 250
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      return {
        sector,
        x,
        y,
        angle: index * 45 + rotationAngle,
      }
    })
  }, [rotationAngle])

  return (
    <div className="max-w-6xl mx-auto">
      {/* En-tête de l'étape */}
      <div className="mb-8 text-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center space-x-3 text-blue-700 mb-4">
            <Icon name="lucide:Compass" className="w-6 h-6" />
            <span className="text-xl font-bold">Étape 2 : Points Cardinaux</span>
          </div>
          <p className="text-gray-600">
            Alignez le Nord du Bagua avec le Nord de votre plan. Utilisez les contrôles ci-dessous
            pour faire tourner l'orientation.
          </p>
        </div>
      </div>

      {/* Contrôles de rotation */}
      <div className="mb-8 text-center">
        <RotationControls
          rotationAngle={rotationAngle}
          onRotate={handleRotate}
          onReset={resetRotation}
        />
      </div>

      {/* Roue principale */}
      <div className="relative flex justify-center items-center mb-8">
        <div className="relative w-[700px] h-[700px]">
          {/* Plan central fixe */}
          <div className="absolute w-48 h-48 rounded-2xl border-4 border-white shadow-2xl overflow-hidden left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <img
              src={uploadedPlan.preview}
              alt="Plan uploadé"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white p-4 text-center">
              <div className="text-lg font-bold mb-1">Votre Plan</div>
              <div className="text-xs opacity-75">Centre fixe</div>
            </div>
          </div>

          {/* Cartes en cercle */}
          {cardPositions.map(({ sector, x, y }) => (
            <div
              key={sector.id}
              className={`absolute w-32 h-32 rounded-xl border-4 border-white shadow-xl cursor-pointer transition-transform duration-300`}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                backgroundColor: sector.elementColor,
                zIndex: 5,
              }}
              onClick={() => handleSectorClick(sector)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1.05)`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1)`
              }}
            >
              <div className="h-full flex flex-col items-center justify-center text-white p-3 text-center">
                <div className="text-sm font-bold mb-1">{sector.name}</div>
                <div className="text-xs opacity-90 capitalize font-medium mb-1">
                  {sector.element}
                </div>
                <div className="text-xs opacity-75 leading-tight">
                  {sector.concepts.slice(0, 2).join(', ')}
                </div>
              </div>
            </div>
          ))}

          {/* Lignes de connexion */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
              </linearGradient>
            </defs>
            {cardPositions.map(({ x, y }, index) => {
              const x1 = 350 // centre
              const y1 = 350
              const x2 = 350 + x
              const y2 = 350 + y

              return (
                <line
                  key={index}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                />
              )
            })}
          </svg>
        </div>
      </div>

      {/* Bouton suivant */}
      <div className="text-center">
        <Button
          onClick={handleNextStep}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center space-x-2">
            <Icon name="lucide:ArrowRight" className="w-5 h-5" />
            <span>Continuer vers l'analyse</span>
          </div>
        </Button>
      </div>
    </div>
  )
}
