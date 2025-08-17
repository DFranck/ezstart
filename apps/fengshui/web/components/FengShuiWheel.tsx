'use client'

import { FENGSHUI_SECTORS, FengShuiSector } from '@/lib/fengshui-data'
import { useMemo, useState } from 'react'
import { RotationControls } from './RotationControls'

interface FengShuiWheelProps {
  uploadedPlan: { file: File; preview: string }
  onSectorClick: (sector: FengShuiSector) => void
  selectedSector: FengShuiSector | null
}

export function FengShuiWheel({ uploadedPlan, onSectorClick, selectedSector }: FengShuiWheelProps) {
  const [rotationAngle, setRotationAngle] = useState(0)

  const handleRotate = (newAngle: number) => {
    setRotationAngle(newAngle)
  }

  const resetRotation = () => {
    setRotationAngle(0)
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
      {/* Instructions et Contrôles */}
      <div className="mb-8 text-center">
        <RotationControls
          rotationAngle={rotationAngle}
          onRotate={handleRotate}
          onReset={resetRotation}
        />
      </div>

      {/* Roue principale */}
      <div className="relative flex justify-center items-center">
        <div className="relative w-[600px] h-[600px]">
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
              className={`absolute w-32 h-32 rounded-xl border-4 border-white shadow-xl cursor-pointer transition-transform duration-300 ${
                selectedSector?.id === sector.id ? 'ring-4 ring-blue-400 ring-offset-4' : ''
              }`}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                backgroundColor: sector.elementColor,
                zIndex: selectedSector?.id === sector.id ? 20 : 5,
              }}
              onClick={() => onSectorClick(sector)}
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

                {/* Indicateurs */}
                {sector.positiveIndicator && (
                  <div className="mt-1 flex items-center text-xs">
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full mr-1"></div>
                    <span className="truncate text-xs">{sector.positiveIndicator}</span>
                  </div>
                )}
                {sector.negativeIndicator && (
                  <div className="mt-0.5 flex items-center text-xs">
                    <div className="w-1.5 h-1.5 bg-red-300 rounded-full mr-1"></div>
                    <span className="truncate text-xs">{sector.negativeIndicator}</span>
                  </div>
                )}
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
              const x1 = 300 // centre
              const y1 = 300
              const x2 = 300 + x
              const y2 = 300 + y

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
    </div>
  )
}
