/* path: /components/steps/AnalysisStep.tsx */
'use client'

import type {
  BaguaSector,
  CardinalStepData,
  GridStyle,
  UploadStepData,
  VisualizationMode,
} from '@/types/bagua'
import { BAGUA_SECTORS } from '@/types/bagua'
import { Icon, StepContent, StepSummary, useStepper } from '@ezstart/ui/components'
import { useState } from 'react'
import BaguaGridOverlay from './BaguaGridOverlay'
import BaguaWheel from './BaguaWheel'

export default function AnalysisStep() {
  return (
    <StepContent stepId="analysis">
      {() => {
        const { getStepData } = useStepper()
        const uploadData = (getStepData('upload') as UploadStepData) ?? {}
        const cardinalData = (getStepData('cardinal-points') as CardinalStepData) ?? {}

        if (!uploadData.file || !uploadData.preview) return null

        // on consomme UNIQUEMENT le bearing calculé en step 2
        const rotationAngle = cardinalData.rotationAngle ?? 0
        const bearingFromNorth = cardinalData.bearingFromNorth ?? (rotationAngle + 90) % 360

        const [mode, setMode] = useState<VisualizationMode>('grid')
        const [gridStyle, setGridStyle] = useState<GridStyle>('square')
        const [selected, setSelected] = useState<BaguaSector | null>(null)

        return (
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-3 text-blue-700 mb-2">
                  <Icon name="lucide:Map" className="w-6 h-6" />
                  <span className="text-xl font-bold">Étape 3 : Analyse Bagua</span>
                </div>
                <p className="text-gray-600">
                  Visualisez votre plan avec les secteurs Bagua superposés. Cliquez sur un secteur
                  pour voir ses détails.
                </p>

                {/* Switch rendu */}
                <div className="mt-4 inline-flex gap-2 rounded-xl border bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setMode('grid')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      mode === 'grid' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                    }`}
                    aria-pressed={mode === 'grid'}
                  >
                    Grille 3×3
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('wheel')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      mode === 'wheel' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                    }`}
                    aria-pressed={mode === 'wheel'}
                  >
                    Roue (pizza)
                  </button>
                </div>

                {/* Sous-choix de la grille */}
                {mode === 'grid' && (
                  <div className="mt-2 inline-flex gap-2 rounded-xl border bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setGridStyle('square')}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        gridStyle === 'square' ? 'bg-slate-800 text-white' : 'hover:bg-gray-100'
                      }`}
                      aria-pressed={gridStyle === 'square'}
                    >
                      Carré
                    </button>
                    <button
                      type="button"
                      onClick={() => setGridStyle('diamond')}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        gridStyle === 'diamond' ? 'bg-slate-800 text-white' : 'hover:bg-gray-100'
                      }`}
                      aria-pressed={gridStyle === 'diamond'}
                    >
                      Losange
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Légende */}
              <aside className="lg:col-span-1">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Secteurs Bagua</h3>
                  <div className="space-y-2 mb-6">
                    {BAGUA_SECTORS.map(sector => (
                      <button
                        key={sector.id}
                        type="button"
                        className={`w-full text-left flex items-center space-x-3 p-2 rounded-lg border transition-colors ${
                          selected?.id === sector.id
                            ? 'bg-blue-50 border-blue-300'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => setSelected(sector)}
                      >
                        <span
                          className="w-4 h-4 rounded-full inline-block"
                          style={{ backgroundColor: sector.color }}
                        />
                        <div>
                          <div className="font-medium text-gray-700">{sector.name}</div>
                          <div className="text-xs text-gray-500">
                            {sector.element} • {sector.direction}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selected && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">{selected.name}</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>
                          <strong>Élément:</strong> {selected.element}
                        </p>
                        <p>
                          <strong>Direction:</strong> {selected.direction}
                        </p>
                        <p>
                          <strong>Couleur:</strong> <span style={{ color: selected.color }}>●</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </aside>

              {/* Visualisation */}
              <section className="lg:col-span-3">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                  {mode === 'grid' ? (
                    <BaguaGridOverlay
                      src={uploadData.preview!}
                      bearingFromNorth={bearingFromNorth}
                      style={gridStyle}
                    />
                  ) : (
                    <BaguaWheel
                      src={uploadData.preview!}
                      bearingFromNorth={bearingFromNorth}
                      size={620}
                    />
                  )}

                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Orientation appliquée : <strong>{Math.round(bearingFromNorth)}°</strong>{' '}
                      depuis le Nord.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-8">
              <StepSummary />
            </div>
          </div>
        )
      }}
    </StepContent>
  )
}
