/* path: /components/steps/CardinalPointsStep.tsx */
'use client'

import { THEME_COLORS } from '@/lib/theme-colors'
import type { CardinalStepData, UploadStepData } from '@/types/bagua'
import {
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  Icon,
  P,
  StepContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useStepper,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

// Composant interne pour gérer le drag et les hooks
const CardinalWheel = ({
  data,
  updateData,
  uploadData,
  isMobile,
  t,
}: {
  data: CardinalStepData
  updateData: (newData: Partial<CardinalStepData>) => void
  uploadData: UploadStepData
  isMobile: boolean
  t: any
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartAngleRef = useRef<number>(0)

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

  // Utiliser directement data.rotationAngle au lieu d'un état local pour éviter la désynchronisation
  const currentRotation = data.rotationAngle ?? 0

  const handleRotate = (newAngle: number) => {
    const norm = ((newAngle % 360) + 360) % 360
    updateData({ rotationAngle: norm, bearingFromNorth: norm })
  }

  const resetRotation = () => {
    updateData({ rotationAngle: 0, bearingFromNorth: 0 }) // bearing = 0 pour Nord en haut
  }

  // Calcul de l'angle entre le centre et la position de la souris/touch
  const calculateAngle = (clientX: number, clientY: number) => {
    if (!wrapperRef.current) return 0
    const rect = wrapperRef.current.getBoundingClientRect()
    const centerX = rect.left + cx
    const centerY = rect.top + cy
    const dx = clientX - centerX
    const dy = clientY - centerY
    // atan2 retourne l'angle en radians, on convertit en degrés
    return Math.atan2(dy, dx) * (180 / Math.PI)
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
    const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY
    dragStartAngleRef.current = calculateAngle(clientX, clientY) - currentRotation
  }

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return
    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
    const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY
    const currentAngle = calculateAngle(clientX, clientY)
    const newRotation = currentAngle - dragStartAngleRef.current
    handleRotate(newRotation)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Event listeners pour le drag
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      handleDragMove(e)
    }

    const handleEnd = () => {
      handleDragEnd()
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, currentRotation])

  const cardinalPoints = [
    { direction: 'N', angle: -90, label: t('cardinal.north') }, // Nord en haut (270° ou -90°)
    { direction: 'E', angle: 0, label: t('cardinal.east') }, // Est à droite (0°)
    { direction: 'S', angle: 90, label: t('cardinal.south') }, // Sud en bas (90°)
    { direction: 'O', angle: 180, label: t('cardinal.west') }, // Ouest à gauche (180°)
  ] as const

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <Card variant={'ghost'} className={cn('gap-2 max-w-lg mx-auto')}>
        <CardHeader className="flex items-center gap-2">
          <Div className="min-w-8 h-8 rounded-full flex items-center justify-center ">
            <Icon name="lucide:Upload" size={16} />
          </Div>
          <H2 size={'h5'} className="text-left flex items-center gap-2">
            {t('cardinal.title')}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="">
                    <Icon name="lucide:Info" size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <P className="text-xs">{t('cardinal.tooltipHelp')}</P>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </H2>
        </CardHeader>
        <CardContent className="">
          <P variant={'description'}>{t('cardinal.description')}</P>
          <P variant={'description'} className="mt-2 text-xs">
            💡 {t('cardinal.dragHint') || 'Drag any cardinal point to rotate'}
          </P>
        </CardContent>
      </Card>
      {/* Contrôles */}
      {/* <div className="flex items-center justify-center space-x-2 mb-4">
        <Div layout={'center'}>
          <Label htmlFor="-rotate-45">45°</Label>
          <Button id="-rotate-45" onClick={() => handleRotate(currentRotation - 45)} size="sm">
            <Icon name="lucide:RotateCcw" className="w-4 h-4" />
          </Button>
        </Div>
        <Div layout={'center'}>
          <Label htmlFor="-rotate-10">10°</Label>
          <Button id="-rotate-10" onClick={() => handleRotate(currentRotation - 10)} size="sm">
            <Icon name="lucide:RotateCcw" className="w-4 h-4" />
          </Button>
        </Div>
        <Div layout={'center'}>
          <Label htmlFor="-rotate-1">1°</Label>
          <Button id="-rotate-1" onClick={() => handleRotate(currentRotation - 1)} size="sm">
            <Icon name="lucide:RotateCcw" className="w-4 h-4" />
          </Button>
        </Div>

        <div className="w-px h-8 bg-gray-300 mx-2" />

        <Div layout={'center'}>
          <Label htmlFor="+rotate-1">1°</Label>
          <Button id="+rotate-1" onClick={() => handleRotate(currentRotation + 1)} size="sm">
            <Icon name="lucide:RotateCw" className="w-4 h-4" />
          </Button>
        </Div>
        <Div layout={'center'}>
          <Label htmlFor="+rotate-10">10°</Label>
          <Button id="+rotate-10" onClick={() => handleRotate(currentRotation + 10)} size="sm">
            <Icon name="lucide:RotateCw" className="w-4 h-4" />
          </Button>
        </Div>
        <Div layout={'center'}>
          <Label htmlFor="+rotate-45">45°</Label>
          <Button id="+rotate-45" onClick={() => handleRotate(currentRotation + 45)} size="sm">
            <Icon name="lucide:RotateCw" className="w-4 h-4" />
          </Button>
        </Div>
      </div> */}

      {/* Roue */}
      <div className="relative flex justify-center items-center ">
        <div ref={wrapperRef} className="relative w-full h-72 md:h-[550px]">
          {/* Plan centré */}
          <div className="absolute w-44 h-44 md:w-96 md:h-96 rounded-2xl border-4 border-white shadow-2xl overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img
              src={uploadData.preview}
              alt="Plan uploadé"
              className="w-full h-full object-contain bg-white"
            />
            <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center text-white p-4 text-center pointer-events-none">
              <div className="text-2xl font-bold mb-1 drop-shadow-lg">{t('cardinal.yourPlan')}</div>
              <div className="text-sm opacity-90 drop-shadow-lg">{t('cardinal.fixedCenter')}</div>
            </div>
          </div>

          {/* Pastilles cardinales (même rayon que les lignes) - DRAGGABLE */}
          {cardinalPoints.map(({ direction, angle, label }) => {
            const a = (angle + currentRotation) * (Math.PI / 180)
            const x = Math.cos(a) * radius
            const y = Math.sin(a) * radius
            return (
              <div
                key={direction}
                className={cn(
                  `absolute bg-gradient-to-r ${THEME_COLORS.gradientClasses} w-10 h-10 md:w-20 md:h-20 rounded-full border-2 border-background shadow-xl z-50 cursor-grab active:cursor-grabbing transition-transform`,
                  isDragging && 'cursor-grabbing'
                )}
                style={{
                  left: cx,
                  top: cy,
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  zIndex: 5,
                  touchAction: 'none', // Empêche le scroll pendant le drag sur mobile
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                <div className="h-full flex flex-col items-center justify-center text-white p-2 text-center pointer-events-none">
                  <div className="text-lg md:text-xl font-bold">{direction}</div>
                  <div className="text-xs md:text-sm opacity-90 hidden md:block">{label}</div>
                </div>
              </div>
            )
          })}

          {/* Lignes → centre dynamique (cx, cy) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.2)" />
              </linearGradient>
            </defs>
            {cardinalPoints.map(({ angle }) => {
              const a = (angle + currentRotation) * (Math.PI / 180)
              const adjustedRadius = isMobile ? radius - 20 : radius - 40
              const x = Math.cos(a) * adjustedRadius
              const y = Math.sin(a) * adjustedRadius
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
}

const CardinalPointsStep = (): any => {
  const { isMobile } = useDevice()
  const t = useTranslations()

  return (
    <StepContent stepId="cardinal-points">
      {(data: CardinalStepData, updateData) => {
        const { getStepData } = useStepper()
        const uploadData = (getStepData('upload') as UploadStepData) ?? {}

        if (!uploadData.file || !uploadData.preview) {
          return (
            <Div className="max-w-4xl mx-auto text-center">
              <Div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8">
                <H2 size={'h3'} className="text-lg font-semibold text-destructive mb-2">
                  {t('cardinal.error')}
                </H2>
                <P className="text-destructive">{t('cardinal.noFile')}</P>
              </Div>
            </Div>
          )
        }

        return (
          <CardinalWheel
            data={data}
            updateData={updateData}
            uploadData={uploadData}
            isMobile={isMobile}
            t={t}
          />
        )
      }}
    </StepContent>
  )
}

export default CardinalPointsStep
