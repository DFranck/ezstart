'use client'

import { Button, Icon } from '@ezstart/ui/components'

interface RotationControlsProps {
  rotationAngle: number
  onRotate: (angle: number) => void
  onReset: () => void
}

export function RotationControls({ rotationAngle, onRotate, onReset }: RotationControlsProps) {
  const handleRotate = (increment: number) => {
    onRotate((rotationAngle + increment + 360) % 360)
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-center space-x-3 text-blue-700 mb-4">
        <Icon name="lucide:RotateCw" className="w-5 h-5" />
        <span className="font-medium">Faites tourner l'orientation du Bagua</span>
        <button
          onClick={onReset}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
        >
          <Icon name="lucide:RotateCcw" className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Contrôles de rotation */}
      <div className="mb-4">
        {/* Affichage de l'angle */}
        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-gray-800">{Math.round(rotationAngle)}°</div>
          <div className="text-sm text-gray-600">Angle de rotation</div>
        </div>

        {/* Boutons de rotation */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          {/* Rotation -45° */}
          <Button onClick={() => handleRotate(-45)} title="Tourner de -45°">
            <Icon name="lucide:RotateCcw" className="w-4 h-4" />
            <span className="text-xs ml-1">45°</span>
          </Button>

          {/* Rotation -10° */}
          <Button onClick={() => handleRotate(-10)} title="Tourner de -10°">
            <Icon name="lucide:RotateCcw" className="w-4 h-4" />
            <span className="text-xs ml-1">10°</span>
          </Button>

          {/* Rotation -1° */}
          <Button onClick={() => handleRotate(-1)} title="Tourner de -1°">
            <Icon name="lucide:RotateCcw" className="w-4 h-4" />
            <span className="text-xs ml-1">1°</span>
          </Button>

          {/* Séparateur */}
          <div className="w-px h-8 bg-gray-300 mx-2"></div>

          {/* Rotation +1° */}
          <Button onClick={() => handleRotate(1)} title="Tourner de +1°">
            <Icon name="lucide:RotateCw" className="w-4 h-4" />
            <span className="text-xs ml-1">1°</span>
          </Button>

          {/* Rotation +10° */}
          <Button onClick={() => handleRotate(10)} title="Tourner de +10°">
            <Icon name="lucide:RotateCw" className="w-4 h-4" />
            <span className="text-xs ml-1">10°</span>
          </Button>

          {/* Rotation +45° */}
          <Button onClick={() => handleRotate(45)} title="Tourner de +45°">
            <Icon name="lucide:RotateCw" className="w-4 h-4" />
            <span className="text-xs ml-1">45°</span>
          </Button>
        </div>

        {/* Légende */}
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>-45° (secteur)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>-10°</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>-1°</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>+1°</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>+10°</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>+45° (secteur)</span>
          </div>
        </div>
      </div>

      <p className="text-gray-600 text-sm text-center">
        Votre plan reste fixe au centre. Utilisez les boutons pour aligner le Nord du Bagua avec le
        Nord de votre plan.
      </p>
    </div>
  )
}
