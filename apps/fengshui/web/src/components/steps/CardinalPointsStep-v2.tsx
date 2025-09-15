/* path: /components/steps/CardinalPointsStep.tsx */
'use client'

import type { CardinalStepData, UploadStepData } from '@/types/bagua'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  Icon,
  Label,
  P,
  StepContent,
  useStepper,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import { useEffect, useRef, useState } from 'react'

const CardinalPointsStep = () => {
  const { isMobile } = useDevice()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry?.contentRect ?? { width: 0, height: 0 }
      setBox({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Centre + rayon dynamiques (même base pour pastilles & lignes)
  const cx = box.w / 2
  const cy = box.h / 2
  const radius = Math.max(Math.min(box.w, box.h) / 2 - (isMobile ? 20 : 10), 0) // marge visuelle

  // 💡 Petit fix hooks: déclare tes hooks AVANT tout "return" conditionnel dans StepContent.
  // Ex.: const [rotationAngle, setRotationAngle] = useState(...); puis if (!uploadData.file) return ...

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

        // Utiliser directement data.rotationAngle au lieu d'un état local pour éviter la désynchronisation
        const currentRotation = data.rotationAngle ?? 0

        const handleRotate = (newAngle: number) => {
          const norm = ((newAngle % 360) + 360) % 360
          updateData({ rotationAngle: norm, bearingFromNorth: norm })
        }

        const resetRotation = () => {
          updateData({ rotationAngle: 0, bearingFromNorth: 0 }) // bearing = 0 pour Nord en haut
        }

        const cardinalPoints = [
          { direction: 'N', angle: -90, label: 'Nord' },    // Nord en haut (270° ou -90°)
          { direction: 'E', angle: 0, label: 'Est' },       // Est à droite (0°)
          { direction: 'S', angle: 90, label: 'Sud' },      // Sud en bas (90°)
          { direction: 'O', angle: 180, label: 'Ouest' },   // Ouest à gauche (180°)
        ] as const

        return (
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <Card variant={'ghost'} className={cn('gap-2 max-w-lg mx-auto')}>
              <CardHeader className="flex items-center gap-2">
                <Div className="min-w-8 h-8 rounded-full flex items-center justify-center bg-foreground">
                  <Icon name="lucide:Upload" size={16} className=" bg-foreground text-background" />
                </Div>
                <H2 size={'h5'} className="text-left">
                  Étape 2 : Points Cardinaux
                </H2>
              </CardHeader>
              <CardContent className="">
                <P variant={'description'}>
                  Alignez le Nord de la boussole avec le Nord de votre plan. Utilisez les contrôles
                  pour faire tourner l&apos;orientation.
                </P>
              </CardContent>
            </Card>
            {/* Contrôles */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Div layout={'center'}>
                <Label htmlFor="-rotate-45">45°</Label>
                <Button
                  id="-rotate-45"
                  onClick={() => handleRotate(currentRotation - 45)}
                  size="sm"
                  className="w-10 h-10 grid place-items-center bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg"
                  title="−45°"
                >
                  <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                </Button>
              </Div>
              <Div layout={'center'}>
                <Label htmlFor="-rotate-10">10°</Label>
                <Button
                  id="-rotate-10"
                  onClick={() => handleRotate(currentRotation - 10)}
                  size="sm"
                  className="w-10 h-10 grid place-items-center bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg"
                  title="−10°"
                >
                  <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                </Button>
              </Div>
              <Div layout={'center'}>
                <Label htmlFor="-rotate-1">1°</Label>
                <Button
                  id="-rotate-1"
                  onClick={() => handleRotate(currentRotation - 1)}
                  size="sm"
                  className="w-10 h-10 grid place-items-center bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-lg"
                  title="−1°"
                >
                  <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                </Button>
              </Div>

              <div className="w-px h-8 bg-gray-300 mx-2" />

              <Div layout={'center'}>
                <Label htmlFor="+rotate-1">1°</Label>
                <Button
                  id="+rotate-1"
                  onClick={() => handleRotate(currentRotation + 1)}
                  size="sm"
                  className="w-10 h-10 grid place-items-center bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg"
                  title="+1°"
                >
                  <Icon name="lucide:RotateCw" className="w-4 h-4" />
                </Button>
              </Div>
              <Div layout={'center'}>
                <Label htmlFor="+rotate-10">10°</Label>
                <Button
                  id="+rotate-10"
                  onClick={() => handleRotate(currentRotation + 10)}
                  size="sm"
                  className="w-10 h-10 grid place-items-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg"
                  title="+10°"
                >
                  <Icon name="lucide:RotateCw" className="w-4 h-4" />
                </Button>
              </Div>
              <Div layout={'center'}>
                <Label htmlFor="+rotate-45">45°</Label>
                <Button
                  id="+rotate-45"
                  onClick={() => handleRotate(currentRotation + 45)}
                  size="sm"
                  className="w-10 h-10 grid place-items-center bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-lg"
                  title="+45°"
                >
                  <Icon name="lucide:RotateCw" className="w-4 h-4" />
                </Button>
              </Div>
            </div>

            {/* Roue */}
            <div className="relative flex justify-center items-center ">
              <div ref={wrapperRef} className="relative w-full h-72 md:h-[700px]">
                {/* Plan centré */}
                <div className="absolute w-44 h-44 md:w-96 md:h-96 rounded-2xl border-4 border-white shadow-2xl overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
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

                {/* Pastilles cardinales (même rayon que les lignes) */}
                {cardinalPoints.map(({ direction, angle, label }) => {
                  const a = (angle + currentRotation) * (Math.PI / 180)
                  const x = Math.cos(a) * radius
                  const y = Math.sin(a) * radius
                  return (
                    <div
                      key={direction}
                      className="absolute bg-ezstart w-10 h-10 md:w-20 md:h-20 rounded-full border-2 border-white shadow-xl "
                      style={{
                        left: cx,
                        top: cy,
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                        zIndex: 5,
                      }}
                    >
                      <div className="h-full flex flex-col items-center justify-center text-white p-2 text-center">
                        <div className="text-lg md:text-xl font-bold">{direction}</div>
                        <div className="text-xs md:text-sm opacity-90 hidden md:block">{label}</div>
                      </div>
                    </div>
                  )
                })}

                {/* Lignes → centre dynamique (cx, cy) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 15 }}
                >
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(124, 58, 237,0.4)" />
                      <stop offset="100%" stopColor="rgba(124, 58, 237,0.2)" />
                    </linearGradient>
                  </defs>
                  {cardinalPoints.map(({ angle }) => {
                    const a = (angle + currentRotation) * (Math.PI / 180)
                    const x = Math.cos(a) * radius
                    const y = Math.sin(a) * radius
                    return (
                      <line
                        key={angle}
                        x1={cx}
                        y1={cy}
                        x2={cx + x}
                        y2={cy + y}
                        stroke="url(#lineGradient)"
                        strokeWidth={2}
                      />
                    )
                  })}
                </svg>

                {/* Cercle guide → même centre / rayon */}
                <div
                  className="absolute rounded-full border-2 border-dashed border-foreground/40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ width: radius * 2, height: radius * 2 }}
                />
              </div>
            </div>
          </div>
        )
      }}
    </StepContent>
  )
}

export default CardinalPointsStep
