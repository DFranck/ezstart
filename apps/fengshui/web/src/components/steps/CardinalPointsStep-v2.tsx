/* path: /components/steps/CardinalPointsStep.tsx */
'use client'

import { THEME_COLORS } from '@/lib/theme-colors'
import type { CardinalStepData, UploadStepData } from '@/types/bagua'
import {
  Div,
  H2,
  P,
  StepContent,
  useStepper,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import { useTranslations } from 'next-intl'
import React, { useEffect, useRef, useState } from 'react'

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
  t: (key: string) => string
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

  // Calcul de l'angle entre le centre et la position de la souris/touch
  const calculateAngle = (clientX: number, clientY: number) => {
    if (!wrapperRef.current) return 0
    const rect = wrapperRef.current.getBoundingClientRect()
    const centerX = rect.left + cx
    const centerY = rect.top + cy
    const dx = clientX - centerX
    const dy = clientY - centerY
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
    { direction: 'N', angle: -90, label: t('cardinal.north') },
    { direction: 'E', angle: 0, label: t('cardinal.east') },
    { direction: 'S', angle: 90, label: t('cardinal.south') },
    { direction: 'O', angle: 180, label: t('cardinal.west') },
  ] as const

  return (
    <Div className="flex flex-col items-center flex-1 min-h-0">
      {/* Compass wheel */}
      <Div className="relative flex justify-center items-center flex-1 w-full min-h-0">
        <Div ref={wrapperRef} className="relative w-full h-72 md:h-[550px]">
          {/* Plan centré — no overlay */}
          <Div className="absolute w-44 h-44 md:w-96 md:h-96 rounded-2xl border-4 border-white shadow-2xl overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img
              src={uploadData.preview}
              alt="Plan"
              className="w-full h-full object-contain bg-white"
            />
          </Div>

          {/* Pastilles cardinales - DRAGGABLE — compass rose style */}
          {cardinalPoints.map(({ direction, angle, label }) => {
            const a = (angle + currentRotation) * (Math.PI / 180)
            const x = Math.cos(a) * radius
            const y = Math.sin(a) * radius
            const isNorth = direction === 'N'
            const isSouth = direction === 'S'

            // Size varies: N largest, E/O medium, S smallest
            const sizeClass = isNorth
              ? 'w-14 h-14 md:w-24 md:h-24'
              : isSouth
                ? 'w-8 h-8 md:w-14 md:h-14'
                : 'w-10 h-10 md:w-18 md:h-18'

            // Outward angle for the North triangle (degrees)
            const outwardAngle = angle + currentRotation

            return (
              <Div
                key={direction}
                className={cn(
                  'absolute cursor-grab active:cursor-grabbing transition-transform',
                  isDragging && 'cursor-grabbing'
                )}
                style={{
                  left: cx,
                  top: cy,
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  zIndex: 5,
                  touchAction: 'none',
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                {isNorth ? (
                  /* North — compass needle: diamond arrow + circle with "N" */
                  <Div className={cn(sizeClass, 'relative pointer-events-none')}>
                    {/* Outward-pointing triangle */}
                    <Div
                      className="absolute left-1/2 top-1/2"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${outwardAngle - 90}deg)`,
                        width: 0,
                        height: 0,
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderBottom: '16px solid var(--fengshui-primary)',
                        transformOrigin: 'center calc(100% + 12px)',
                        filter: 'drop-shadow(0 -2px 3px rgba(0,0,0,0.3))',
                      }}
                    />
                    {/* Circle body */}
                    <Div
                      className={cn(
                        `w-full h-full rounded-full border-2 border-background shadow-xl bg-gradient-to-r ${THEME_COLORS.gradientClasses}`,
                        'flex flex-col items-center justify-center text-white'
                      )}
                    >
                      <Div className="text-lg md:text-2xl font-extrabold drop-shadow-md">N</Div>
                      <Div className="text-[10px] md:text-sm opacity-90 hidden md:block">{label}</Div>
                    </Div>
                  </Div>
                ) : (
                  /* S / E / O — standard circles with varied sizes */
                  <Div
                    className={cn(
                      sizeClass,
                      `rounded-full border-2 border-background shadow-xl bg-gradient-to-r ${THEME_COLORS.gradientClasses}`,
                      'flex flex-col items-center justify-center text-white pointer-events-none'
                    )}
                  >
                    <Div className={cn(
                      'font-bold',
                      isSouth ? 'text-sm md:text-base' : 'text-base md:text-lg'
                    )}>{direction}</Div>
                    <Div className={cn(
                      'opacity-90 hidden md:block',
                      isSouth ? 'text-[9px]' : 'text-xs'
                    )}>{label}</Div>
                  </Div>
                )}
              </Div>
            )
          })}

          {/* Lignes centre -> pastilles */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 4 }}>
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

          {/* Cercle guide */}
          <Div
            className="absolute rounded-full border-2 border-dashed border-foreground/40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: radius * 2, height: radius * 2 }}
          />
        </Div>
      </Div>

      {/* Hint text below compass */}
      <P variant={'description'} className="text-xs text-center mt-2 text-muted-foreground">
        {t('cardinal.dragHint')}
      </P>
    </Div>
  )
}

const CardinalPointsStep = (): React.JSX.Element => {
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
