'use client'

import { Icon } from '@ezstart/ui/components'
import { useEffect, useRef, useState } from 'react'

interface PlanSectorizerProps {
  uploadedPlan: { file: File; preview: string }
  onSectorsCreated: (sectors: PlanSector[]) => void
}

export interface PlanSector {
  id: string
  direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO' | 'CENTER'
  name: string
  color: string
  coordinates: { x: number; y: number; width: number; height: number }
}

const BAGUA_SECTORS = [
  { id: 'SE', name: 'Sud-Est', color: '#88ff00', position: 'top-left' },
  { id: 'S', name: 'Sud', color: '#00ff88', position: 'top-center' },
  { id: 'SO', name: 'Sud-Ouest', color: '#0088ff', position: 'top-right' },
  { id: 'E', name: 'Est', color: '#ffd700', position: 'middle-left' },
  { id: 'CENTER', name: 'Centre', color: '#cccccc', position: 'center' },
  { id: 'O', name: 'Ouest', color: '#8800ff', position: 'middle-right' },
  { id: 'NE', name: 'Nord-Est', color: '#ff8800', position: 'bottom-left' },
  { id: 'N', name: 'Nord', color: '#ff4444', position: 'bottom-center' },
  { id: 'NO', name: 'Nord-Ouest', color: '#ff0088', position: 'bottom-right' },
] as const

export function PlanSectorizer({ uploadedPlan, onSectorsCreated }: PlanSectorizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [gridSize, setGridSize] = useState({ width: 600, height: 400 })

  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.onload = () => setImageLoaded(true)
    }
  }, [])

  const calculateSectors = () => {
    const { width, height } = gridSize
    const sectorWidth = width / 3
    const sectorHeight = height / 3

    return BAGUA_SECTORS.map(sector => {
      let x = 0
      let y = 0

      switch (sector.position) {
        case 'top-left':
          x = 0
          y = 0
          break
        case 'top-center':
          x = sectorWidth
          y = 0
          break
        case 'top-right':
          x = sectorWidth * 2
          y = 0
          break
        case 'middle-left':
          x = 0
          y = sectorHeight
          break
        case 'center':
          x = sectorWidth
          y = sectorHeight
          break
        case 'middle-right':
          x = sectorWidth * 2
          y = sectorHeight
          break
        case 'bottom-left':
          x = 0
          y = sectorHeight * 2
          break
        case 'bottom-center':
          x = sectorWidth
          y = sectorHeight * 2
          break
        case 'bottom-right':
          x = sectorWidth * 2
          y = sectorHeight * 2
          break
      }

      return {
        id: sector.id,
        direction: sector.id as PlanSector['direction'],
        name: sector.name,
        color: sector.color,
        coordinates: {
          x,
          y,
          width: sectorWidth,
          height: sectorHeight,
        },
      }
    })
  }

  const drawBaguaGrid = () => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dessiner l'image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)

    const sectors = calculateSectors()

    // Dessiner les traits pointillés de la grille
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])

    // Lignes verticales
    ctx.beginPath()
    ctx.moveTo(gridSize.width / 3, 0)
    ctx.lineTo(gridSize.width / 3, gridSize.height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo((gridSize.width / 3) * 2, 0)
    ctx.lineTo((gridSize.width / 3) * 2, gridSize.height)
    ctx.stroke()

    // Lignes horizontales
    ctx.beginPath()
    ctx.moveTo(0, gridSize.height / 3)
    ctx.lineTo(gridSize.width, gridSize.height / 3)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, (gridSize.height / 3) * 2)
    ctx.lineTo(gridSize.width, (gridSize.height / 3) * 2)
    ctx.stroke()

    ctx.setLineDash([])

    // Dessiner les secteurs avec transparence
    sectors.forEach(sector => {
      const { x, y, width, height } = sector.coordinates

      // Rectangle semi-transparent
      ctx.fillStyle = sector.color + '20'
      ctx.fillRect(x, y, width, height)

      // Bordure
      ctx.strokeStyle = sector.color
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, width, height)

      // Texte
      ctx.fillStyle = '#000'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(sector.direction, x + width / 2, y + height / 2 + 5)

      // Nom du secteur
      ctx.font = '12px Arial'
      ctx.fillText(sector.name, x + width / 2, y + height / 2 + 25)
    })
  }

  useEffect(() => {
    if (imageLoaded) {
      drawBaguaGrid()
    }
  }, [imageLoaded, gridSize])

  const handleFinish = () => {
    const sectors = calculateSectors()
    onSectorsCreated(sectors)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="mb-8 text-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center space-x-3 text-blue-700 mb-4">
            <Icon name="lucide:Grid" className="w-6 h-6" />
            <span className="text-xl font-bold">Étape 3 : Grille Bagua</span>
          </div>
          <p className="text-gray-600">
            La grille Bagua traditionnelle est automatiquement appliquée à votre plan. Elle divise
            votre espace en 9 zones selon les principes du Feng Shui.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Légende */}
        <div className="lg:col-span-1">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Zones Bagua</h3>

            <div className="space-y-2 mb-6">
              {BAGUA_SECTORS.map(sector => (
                <div
                  key={sector.id}
                  className="flex items-center space-x-3 p-2 rounded-lg border border-gray-200"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: sector.color }}
                  ></div>
                  <div>
                    <div className="font-medium text-gray-700">{sector.name}</div>
                    <div className="text-xs text-gray-500">{sector.id}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleFinish}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition-colors font-semibold"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Icon name="lucide:Check" className="w-5 h-5" />
                  <span>Continuer avec cette grille</span>
                </div>
              </button>
            </div>
          </div>

          {/* Informations */}
          <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h4 className="font-semibold text-gray-800 mb-3">Comment ça marche</h4>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• La grille divise automatiquement votre plan en 9 zones</p>
              <p>• Chaque zone correspond à un aspect de votre vie</p>
              <p>• Les traits pointillés montrent les divisions</p>
              <p>• Le centre représente la santé et l'équilibre</p>
            </div>
          </div>
        </div>

        {/* Canvas avec grille */}
        <div className="lg:col-span-3">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={gridSize.width}
                height={gridSize.height}
                className="border border-gray-300 rounded-lg max-w-full h-auto"
              />

              {/* Image cachée pour le canvas */}
              <img ref={imageRef} src={uploadedPlan.preview} alt="Plan" className="hidden" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
