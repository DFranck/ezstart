'use client'

import { PlanUploader } from '@/components/PlanUploader'
import { Icon, StepContent, Stepper, StepSummary, useStepper } from '@ezstart/ui/components'
import { useState } from 'react'

// Composants pour chaque étape
function UploadStep() {
  return (
    <StepContent stepId="upload">
      {(data, updateData) => (
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                <Icon name="lucide:Upload" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Étape 1 : Import de votre Plan</h2>
                <p className="text-gray-600">Uploadez le plan de votre appartement ou maison</p>
              </div>
            </div>
            <PlanUploader
              onPlanUpload={(file, preview) => {
                updateData({ file, preview })
              }}
            />
          </div>
        </div>
      )}
    </StepContent>
  )
}

function CardinalPointsStepWrapper() {
  return (
    <StepContent stepId="cardinal-points">
      {(data, updateData) => {
        // Récupérer les données de l'étape upload depuis le contexte du stepper
        const { getStepData } = useStepper()
        const uploadData = getStepData('upload')

        console.log('Upload data in step 2:', uploadData)

        if (!uploadData.file || !uploadData.preview) {
          return (
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
                <p className="text-red-700">
                  Aucun plan n'a été uploadé. Veuillez retourner à l'étape 1 pour uploader un plan.
                </p>
                <p className="text-sm text-red-600 mt-2">Debug: {JSON.stringify(uploadData)}</p>
              </div>
            </div>
          )
        }

        const [rotationAngle, setRotationAngle] = useState(data.rotationAngle || 0)

        const handleRotate = (newAngle: number) => {
          setRotationAngle(newAngle)
          updateData({ rotationAngle: newAngle })
        }

        const resetRotation = () => {
          setRotationAngle(0)
          updateData({ rotationAngle: 0 })
        }

        // Positions des points cardinaux (comme une montre)
        const cardinalPoints = [
          { direction: 'N', angle: 0, label: 'Nord' },
          { direction: 'E', angle: 90, label: 'Est' },
          { direction: 'S', angle: 180, label: 'Sud' },
          { direction: 'O', angle: 270, label: 'Ouest' },
        ]

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
                  pour faire tourner l'orientation.
                </p>
              </div>
            </div>

            {/* Contrôles de rotation */}
            <div className="mb-8 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-3 text-blue-700 mb-4">
                  <Icon name="lucide:RotateCw" className="w-5 h-5" />
                  <span className="font-medium">Faites tourner l'orientation</span>
                  <button
                    onClick={resetRotation}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                  >
                    <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Affichage de l'angle */}
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-800">
                    {Math.round(rotationAngle)}°
                  </div>
                  <div className="text-sm text-gray-600">Angle de rotation</div>
                </div>

                {/* Boutons de rotation */}
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <button
                    onClick={() => handleRotate(rotationAngle - 45)}
                    className="flex items-center justify-center w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
                    title="Tourner de -45°"
                  >
                    <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                    <span className="text-xs ml-1">45°</span>
                  </button>

                  <button
                    onClick={() => handleRotate(rotationAngle - 10)}
                    className="flex items-center justify-center w-10 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-lg"
                    title="Tourner de -10°"
                  >
                    <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                    <span className="text-xs ml-1">10°</span>
                  </button>

                  <button
                    onClick={() => handleRotate(rotationAngle - 1)}
                    className="flex items-center justify-center w-10 h-10 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors shadow-lg"
                    title="Tourner de -1°"
                  >
                    <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                    <span className="text-xs ml-1">1°</span>
                  </button>

                  <div className="w-px h-8 bg-gray-300 mx-2"></div>

                  <button
                    onClick={() => handleRotate(rotationAngle + 1)}
                    className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-lg"
                    title="Tourner de +1°"
                  >
                    <Icon name="lucide:RotateCw" className="w-4 h-4" />
                    <span className="text-xs ml-1">1°</span>
                  </button>

                  <button
                    onClick={() => handleRotate(rotationAngle + 10)}
                    className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg"
                    title="Tourner de +10°"
                  >
                    <Icon name="lucide:RotateCw" className="w-4 h-4" />
                    <span className="text-xs ml-1">10°</span>
                  </button>

                  <button
                    onClick={() => handleRotate(rotationAngle + 45)}
                    className="flex items-center justify-center w-10 h-10 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors shadow-lg"
                    title="Tourner de +45°"
                  >
                    <Icon name="lucide:RotateCw" className="w-4 h-4" />
                    <span className="text-xs ml-1">45°</span>
                  </button>
                </div>

                <p className="text-gray-600 text-sm text-center">
                  Votre plan reste fixe au centre. Utilisez les boutons pour aligner le Nord de la
                  boussole avec le Nord de votre plan.
                </p>
              </div>
            </div>

            {/* Roue principale avec plan central et points cardinaux */}
            <div className="relative flex justify-center items-center">
              <div className="relative w-[600px] h-[600px]">
                {/* Plan central fixe */}
                <div className="absolute w-48 h-48 rounded-2xl border-4 border-white shadow-2xl overflow-hidden left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <img
                    src={uploadData.preview}
                    alt="Plan uploadé"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white p-4 text-center">
                    <div className="text-lg font-bold mb-1">Votre Plan</div>
                    <div className="text-xs opacity-75">Centre fixe</div>
                  </div>
                </div>

                {/* Points cardinaux en cercle */}
                {cardinalPoints.map(({ direction, angle, label }) => {
                  const totalAngle = (angle + rotationAngle) * (Math.PI / 180)
                  const radius = 250
                  const x = Math.cos(totalAngle) * radius
                  const y = Math.sin(totalAngle) * radius

                  return (
                    <div
                      key={direction}
                      className="absolute w-16 h-16 rounded-full border-4 border-white shadow-xl cursor-pointer transition-transform duration-300 bg-gradient-to-br from-blue-500 to-blue-600"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                        zIndex: 5,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1.1)`
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1)`
                      }}
                    >
                      <div className="h-full flex flex-col items-center justify-center text-white p-2 text-center">
                        <div className="text-lg font-bold">{direction}</div>
                        <div className="text-xs opacity-90">{label}</div>
                      </div>
                    </div>
                  )
                })}

                {/* Lignes de connexion */}
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
                    const radius = 250
                    const x = Math.cos(totalAngle) * radius
                    const y = Math.sin(totalAngle) * radius

                    return (
                      <line
                        key={angle}
                        x1={300}
                        y1={300}
                        x2={300 + x}
                        y2={300 + y}
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                      />
                    )
                  })}
                </svg>

                {/* Cercle de référence */}
                <div
                  className="absolute w-[500px] h-[500px] rounded-full border-2 border-dashed border-gray-300 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ zIndex: 1 }}
                ></div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
                <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
                <p className="text-blue-700 text-sm">
                  Faites tourner la boussole pour aligner le <strong>Nord (N)</strong> avec le Nord
                  de votre plan. Les autres points cardinaux (Est, Sud, Ouest) s'aligneront
                  automatiquement.
                </p>
              </div>
            </div>
          </div>
        )
      }}
    </StepContent>
  )
}

function AnalysisStep() {
  return (
    <StepContent stepId="analysis">
      {(data, updateData) => {
        // Récupérer les données des étapes précédentes
        const { getStepData } = useStepper()
        const uploadData = getStepData('upload')
        const cardinalData = getStepData('cardinal-points')

        if (!uploadData.file || !uploadData.preview) return null

        // Récupérer l'angle de rotation des points cardinaux
        const rotationAngle = cardinalData.rotationAngle || 0

        // Type local pour les secteurs Bagua
        interface BaguaSector {
          id: string
          name: string
          color: string
          direction: string
          element: string
        }

        const [selectedSector, setSelectedSector] = useState<BaguaSector | null>(null)

        // Définir les 9 secteurs Bagua avec leurs couleurs
        const baguaSectors: BaguaSector[] = [
          { id: 'SE', name: 'Sud-Est', color: '#88ff00', direction: 'Sud-Est', element: 'Bois' },
          { id: 'S', name: 'Sud', color: '#00ff88', direction: 'Sud', element: 'Feu' },
          {
            id: 'SO',
            name: 'Sud-Ouest',
            color: '#0088ff',
            direction: 'Sud-Ouest',
            element: 'Terre',
          },
          { id: 'E', name: 'Est', color: '#ffd700', direction: 'Est', element: 'Bois' },
          { id: 'CENTER', name: 'Centre', color: '#cccccc', direction: 'Centre', element: 'Terre' },
          { id: 'O', name: 'Ouest', color: '#8800ff', direction: 'Ouest', element: 'Métal' },
          { id: 'NE', name: 'Nord-Est', color: '#ff8800', direction: 'Nord-Est', element: 'Terre' },
          { id: 'N', name: 'Nord', color: '#ff4444', direction: 'Nord', element: 'Eau' },
          {
            id: 'NO',
            name: 'Nord-Ouest',
            color: '#ff0088',
            direction: 'Nord-Ouest',
            element: 'Métal',
          },
        ]

        return (
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-3 text-blue-700 mb-4">
                  <Icon name="lucide:Map" className="w-6 h-6" />
                  <span className="text-xl font-bold">Étape 3 : Analyse Bagua</span>
                </div>
                <p className="text-gray-600">
                  Visualisez votre plan avec les secteurs Bagua superposés. Cliquez sur un secteur
                  pour voir ses détails.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Légende des secteurs */}
              <div className="lg:col-span-1">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Secteurs Bagua</h3>

                  <div className="space-y-2 mb-6">
                    {baguaSectors.map(sector => (
                      <div
                        key={sector.id}
                        className={`flex items-center space-x-3 p-2 rounded-lg border border-gray-200 cursor-pointer transition-colors ${
                          selectedSector?.id === sector.id
                            ? 'bg-blue-50 border-blue-300'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedSector(sector)}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: sector.color }}
                        ></div>
                        <div>
                          <div className="font-medium text-gray-700">{sector.name}</div>
                          <div className="text-xs text-gray-500">
                            {sector.element} • {sector.direction}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Informations sur le secteur sélectionné */}
                  {selectedSector && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">{selectedSector.name}</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>
                          <strong>Élément:</strong> {selectedSector.element}
                        </p>
                        <p>
                          <strong>Direction:</strong> {selectedSector.direction}
                        </p>
                        <p>
                          <strong>Couleur:</strong>{' '}
                          <span style={{ color: selectedSector.color }}>●</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan avec secteurs superposés */}
              <div className="lg:col-span-3">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                  <div className="relative">
                    {/* Plan de base */}
                    <div className="relative w-full max-w-2xl mx-auto">
                      <img
                        src={uploadData.preview}
                        alt="Plan avec secteurs Bagua"
                        className="w-full h-auto rounded-lg border-2 border-gray-300"
                      />

                      {/* Overlay des secteurs Bagua */}
                      <div className="absolute inset-0">
                        {/* Grille 3x3 */}
                        <svg
                          className="w-full h-full"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          style={{
                            transform: `rotate(${rotationAngle}deg)`,
                            transformOrigin: 'center',
                          }}
                        >
                          {/* Lignes de la grille */}
                          <line
                            x1="33.33"
                            y1="0"
                            x2="33.33"
                            y2="100"
                            stroke="#666"
                            strokeWidth="0.5"
                            strokeDasharray="2,2"
                          />
                          <line
                            x1="66.66"
                            y1="0"
                            x2="66.66"
                            y2="100"
                            stroke="#666"
                            strokeWidth="0.5"
                            strokeDasharray="2,2"
                          />
                          <line
                            x1="0"
                            y1="33.33"
                            x2="100"
                            y2="33.33"
                            stroke="#666"
                            strokeWidth="0.5"
                            strokeDasharray="2,2"
                          />
                          <line
                            x1="0"
                            y1="66.66"
                            x2="100"
                            y2="66.66"
                            stroke="#666"
                            strokeWidth="0.5"
                            strokeDasharray="2,2"
                          />

                          {/* Secteurs colorés avec transparence */}
                          {/* Sud-Est (top-left) */}
                          <rect
                            x="0"
                            y="0"
                            width="33.33"
                            height="33.33"
                            fill="#88ff00"
                            fillOpacity="0.3"
                          />
                          <text
                            x="16.66"
                            y="20"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            SE
                          </text>

                          {/* Sud (top-center) */}
                          <rect
                            x="33.33"
                            y="0"
                            width="33.33"
                            height="33.33"
                            fill="#00ff88"
                            fillOpacity="0.3"
                          />
                          <text
                            x="50"
                            y="20"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            S
                          </text>

                          {/* Sud-Ouest (top-right) */}
                          <rect
                            x="66.66"
                            y="0"
                            width="33.33"
                            height="33.33"
                            fill="#0088ff"
                            fillOpacity="0.3"
                          />
                          <text
                            x="83.33"
                            y="20"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            SO
                          </text>

                          {/* Est (middle-left) */}
                          <rect
                            x="0"
                            y="33.33"
                            width="33.33"
                            height="33.33"
                            fill="#ffd700"
                            fillOpacity="0.3"
                          />
                          <text
                            x="16.66"
                            y="53.33"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            E
                          </text>

                          {/* Centre */}
                          <rect
                            x="33.33"
                            y="33.33"
                            width="33.33"
                            height="33.33"
                            fill="#cccccc"
                            fillOpacity="0.3"
                          />
                          <text
                            x="50"
                            y="53.33"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            C
                          </text>

                          {/* Ouest (middle-right) */}
                          <rect
                            x="66.66"
                            y="33.33"
                            width="33.33"
                            height="33.33"
                            fill="#8800ff"
                            fillOpacity="0.3"
                          />
                          <text
                            x="83.33"
                            y="53.33"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            O
                          </text>

                          {/* Nord-Est (bottom-left) */}
                          <rect
                            x="0"
                            y="66.66"
                            width="33.33"
                            height="33.33"
                            fill="#ff8800"
                            fillOpacity="0.3"
                          />
                          <text
                            x="16.66"
                            y="86.66"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            NE
                          </text>

                          {/* Nord (bottom-center) */}
                          <rect
                            x="33.33"
                            y="66.66"
                            width="33.33"
                            height="33.33"
                            fill="#ff4444"
                            fillOpacity="0.3"
                          />
                          <text
                            x="50"
                            y="86.66"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            N
                          </text>

                          {/* Nord-Ouest (bottom-right) */}
                          <rect
                            x="66.66"
                            y="66.66"
                            width="33.33"
                            height="33.33"
                            fill="#ff0088"
                            fillOpacity="0.3"
                          />
                          <text
                            x="83.33"
                            y="86.66"
                            textAnchor="middle"
                            fontSize="3"
                            fill="#000"
                            fontWeight="bold"
                          >
                            NO
                          </text>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Les secteurs sont superposés sur votre plan avec une transparence de 30%.
                      Cliquez sur un secteur dans la légende pour le mettre en évidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Résumé des étapes */}
            <div className="mt-8">
              <StepSummary />
            </div>
          </div>
        )
      }}
    </StepContent>
  )
}

export default function HomePage() {
  const steps = [
    {
      id: 'upload',
      title: 'Upload',
      icon: 'lucide:Upload',
      description: 'Import du plan',
      component: <UploadStep />,
    },
    {
      id: 'cardinal-points',
      title: 'Points Cardinaux',
      icon: 'lucide:Compass',
      description: 'Alignement du Bagua',
      component: <CardinalPointsStepWrapper />,
    },
    {
      id: 'analysis',
      title: 'Analyse',
      icon: 'lucide:Map',
      description: 'Exploration des secteurs',
      component: <AnalysisStep />,
    },
  ]

  const handleStepChange = (stepIndex: number, stepId: string) => {
    console.log(`Étape changée: ${stepId} (${stepIndex + 1}/${steps.length})`)
  }

  const handleComplete = (allData: Record<string, any>) => {
    console.log('Toutes les données:', allData)
    // Ici vous pouvez sauvegarder toutes les données ou les envoyer à une API
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              🏮 Feng Shui Bagua
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Analysez votre espace selon les principes traditionnels du Feng Shui
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Stepper
          steps={steps}
          onStepChange={handleStepChange}
          onComplete={handleComplete}
          allowStepNavigation={true}
        />

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">🏮 Feng Shui Bagua</h3>
            <p className="text-gray-600">
              Application basée sur les principes traditionnels du Feng Shui pour harmoniser votre
              espace de vie
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
