/* path: app/(wherever)/PlanUploader.tsx */
'use client'

import { getCroppedImg } from '@/utils/image'
import type { AiValidationResult } from '@/types/bagua'
import { Button, Div, Icon, Input, P, Progress, Span, Spinner } from '@ezstart/ui/components'
import { useAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Cropper, { Area } from 'react-easy-crop'
import { toast } from 'sonner'

/* ------------------------------------------------------------------------------------------
 * Types (kept scale/position for backward-compat with parent onPlanUpload signature)
 * ----------------------------------------------------------------------------------------*/
type Transformations = {
  rotation: number
  scale: number
  position: { x: number; y: number }
  crop?: { x: number; y: number; width: number; height: number }
  zoom?: number
}

interface PlanUploaderProps {
  onPlanUpload: (file: File, preview: string, transformations?: Transformations) => void
  onEditingChange?: (isEditing: boolean) => void
  onEditingStateChange?: (state: {
    isEditing: boolean
    canApply: boolean
    applyHandler: () => Promise<void>
  }) => void
  onValidationResult?: (result: AiValidationResult | null) => void
  className?: string
}

/* ------------------------------------------------------------------------------------------
 * Inline validation badge component
 * ----------------------------------------------------------------------------------------*/
function ValidationBadge({
  result,
  isLoading,
  t,
}: {
  result: AiValidationResult | null
  isLoading: boolean
  t: ReturnType<typeof useTranslations>
}) {
  if (isLoading) {
    return (
      <Div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
        <Spinner size="sm" />
        <P className="text-sm text-muted-foreground">{t('validation.analyzing')}</P>
      </Div>
    )
  }

  if (!result) return null

  if (result.score >= 50) {
    return (
      <Div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-success/10">
        <Icon name="lucide:CheckCircle" className="w-5 h-5 text-success shrink-0" />
        <P className="text-sm text-success">
          {t('validation.valid', {
            rooms: result.roomsDetected,
            score: result.score,
          })}
        </P>
      </Div>
    )
  }

  if (result.score >= 20) {
    return (
      <Div className="flex flex-col gap-1 py-2 px-3 rounded-lg bg-warning/10">
        <Div className="flex items-center gap-2">
          <Icon name="lucide:AlertTriangle" className="w-5 h-5 text-warning shrink-0" />
          <P className="text-sm text-warning font-medium">{t('validation.poorQuality')}</P>
        </Div>
        {result.feedback && (
          <P className="text-xs text-muted-foreground ml-7">{result.feedback}</P>
        )}
      </Div>
    )
  }

  return (
    <Div className="flex flex-col gap-1 py-2 px-3 rounded-lg bg-destructive/10">
      <Div className="flex items-center gap-2">
        <Icon name="lucide:XCircle" className="w-5 h-5 text-destructive shrink-0" />
        <P className="text-sm text-destructive font-medium">{t('validation.invalid')}</P>
      </Div>
      {result.feedback && (
        <P className="text-xs text-muted-foreground ml-7">{result.feedback}</P>
      )}
    </Div>
  )
}
const MIN_W = 50
const MAX_W = 800
const MIN_H = 50
const MAX_H = 400
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

type CropPixels = { width: number; height: number; x: number; y: number }

/* ------------------------------------------------------------------------------------------
 * Component (MINIMAL)
 * ----------------------------------------------------------------------------------------*/
export function PlanUploader({
  onPlanUpload,
  onEditingChange,
  onEditingStateChange,
  onValidationResult,
  className = '',
}: PlanUploaderProps) {
  const t = useTranslations()
  const { isAuthenticated, accessToken } = useAuth()

  // File & preview
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [originalPreview, setOriginalPreview] = useState<string | null>(null) // Garder l'image originale
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // AI validation state
  const [validationResult, setValidationResult] = useState<AiValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const validationAbortRef = useRef<AbortController | null>(null)

  // Minimal editing state
  const [isEditing, setIsEditing] = useState(false)
  const [rotation, setRotation] = useState<number>(0)
  const [zoom, setZoom] = useState<number>(0.5) // Commencer plus petit pour mobile
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropPixels | null>(null)

  // Only width/height controls for the crop area - responsive defaults
  const [cropWidth, setCropWidth] = useState<number>(280) // Plus petit pour mobile
  const [cropHeight, setCropHeight] = useState<number>(180) // Plus petit pour mobile

  // Ajuster les dimensions du crop selon la taille d'écran
  useEffect(() => {
    const updateCropSize = () => {
      const isMobile = window.innerWidth < 640 // sm breakpoint
      const isTablet = window.innerWidth < 768 // md breakpoint

      if (isMobile) {
        setCropWidth(200) // Plus petit pour laisser plus d'espace
        setCropHeight(120)
      } else if (isTablet) {
        setCropWidth(250)
        setCropHeight(150)
      } else {
        setCropWidth(300)
        setCropHeight(200)
      }
    }

    updateCropSize()
    window.addEventListener('resize', updateCropSize)
    return () => window.removeEventListener('resize', updateCropSize)
  }, [])

  // --- AI validation + auto-save ---
  const triggerAiValidation = useCallback(
    async (dataUrl: string, file: File) => {
      // Abort any previous validation
      validationAbortRef.current?.abort()
      const controller = new AbortController()
      validationAbortRef.current = controller

      setIsValidating(true)
      setValidationResult(null)
      onValidationResult?.(null)

      try {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: dataUrl }),
          signal: controller.signal,
        })

        if (!response.ok) {
          // If 401 (unauthenticated), skip validation silently
          if (response.status === 401) {
            logger.debug('[PlanUploader] Skipping AI validation — not authenticated')
            return
          }
          throw new Error(`Validation API error: ${response.status}`)
        }

        const json = await response.json()
        const result = json.data as AiValidationResult

        if (!controller.signal.aborted) {
          setValidationResult(result)
          onValidationResult?.(result)

          // Auto-save if authenticated and score >= 20
          if (isAuthenticated && result.score >= 20) {
            try {
              // Get image dimensions
              const img = new Image()
              img.src = dataUrl
              await new Promise<void>(resolve => {
                img.onload = () => resolve()
                // If already loaded (cached)
                if (img.complete) resolve()
              })

              await fetch('/api/plans', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                  name: file.name,
                  imageData: dataUrl,
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                }),
              })
              toast.success(t('validation.saved'))
            } catch (saveErr) {
              logger.warn('[PlanUploader] Auto-save failed', saveErr)
            }
          } else if (!isAuthenticated && result.score >= 20) {
            toast.info(t('validation.loginToSave'), { duration: 5000 })
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        logger.warn('[PlanUploader] AI validation failed', err)
      } finally {
        if (!controller.signal.aborted) {
          setIsValidating(false)
        }
      }
    },
    [isAuthenticated, accessToken, onValidationResult, t]
  )

  // Notify parent about editing state changes
  useEffect(() => {
    const canApply = Boolean(uploadedFile && preview && croppedAreaPixels)

    onEditingStateChange?.({
      isEditing,
      canApply,
      applyHandler: handleApply,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, uploadedFile, preview, croppedAreaPixels])

  const handleApply = useCallback(async () => {
    if (!uploadedFile || !preview || !croppedAreaPixels) return

    const { file: outFile, dataUrl } = await getCroppedImg(preview, croppedAreaPixels, rotation)

    setUploadedFile(outFile)
    setPreview(dataUrl)
    setIsEditing(false)
    onEditingChange?.(false)

    // reset transient edit state
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })

    onPlanUpload(outFile, dataUrl, {
      rotation,
      scale: 1,
      position: { x: 0, y: 0 },
      crop: {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
      },
      zoom,
    })

    // Trigger AI validation on the cropped image (non-blocking)
    triggerAiValidation(dataUrl, outFile)
  }, [uploadedFile, preview, croppedAreaPixels, rotation, zoom, onPlanUpload, onEditingChange, triggerAiValidation])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Client-side validation: file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('validation.tooLarge'))
        return
      }

      // Client-side validation: format (JPG, PNG only)
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(t('validation.invalidFormat'))
        return
      }

      // Reset validation state for new file
      setValidationResult(null)
      onValidationResult?.(null)
      setIsValidating(false)

      setUploadedFile(file)
      setIsProcessing(true)
      setUploadProgress(0)

      const reader = new FileReader()

      // Simulate progress for better UX feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 50)

      reader.onload = e => {
        clearInterval(progressInterval)
        setUploadProgress(100)

        const result = e.target?.result as string
        setPreview(result)
        setOriginalPreview(result) // Sauvegarder l'image originale
        setIsEditing(true)
        onEditingChange?.(true)
        setRotation(0)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        setCroppedAreaPixels(null)

        // Notify parent immediately with the file (even before crop is applied)
        onPlanUpload(file, result, {
          rotation: 0,
          scale: 1,
          position: { x: 0, y: 0 },
        })

        setTimeout(() => {
          setIsProcessing(false)
          setUploadProgress(0)
        }, 300)
      }

      reader.onerror = () => {
        clearInterval(progressInterval)
        setIsProcessing(false)
        setUploadProgress(0)
      }

      reader.readAsDataURL(file)
    },
    [onPlanUpload, onEditingChange, onValidationResult, t]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    useFsAccessApi: false,
  })

  const removeFile = () => {
    validationAbortRef.current?.abort()
    setUploadedFile(null)
    setPreview(null)
    setOriginalPreview(null)
    setIsEditing(false)
    onEditingChange?.(false)
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    setCroppedAreaPixels(null)
    setValidationResult(null)
    setIsValidating(false)
    onValidationResult?.(null)
  }

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    // react-easy-crop's Area = { x,y,width,height }
    setCroppedAreaPixels(areaPx as CropPixels)
  }, [])

  const handleCancel = () => {
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    setIsEditing(false)
    onEditingChange?.(false)
  }

  const isImage = Boolean(uploadedFile && uploadedFile.type.startsWith('image/'))

  return (
    <Div className={`flex flex-col ${className}`}>
      {!uploadedFile ? (
        <Div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <Div
            {...getRootProps()}
            className={`relative w-full max-w-2xl flex flex-col items-center justify-center rounded-xl border bg-card/50 shadow-sm min-h-[350px] sm:min-h-[450px] text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary bg-primary/10 shadow-lg scale-[1.01]'
                : 'border-border hover:border-muted-foreground hover:shadow-md'
            }`}
            aria-label="Dropzone"
          >
            <input {...getInputProps()} aria-label="Select file" />

            {/* SVG floor plan placeholder as subtle background */}
            <img
              src="/images/floor-plan-placeholder.svg"
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none p-10 sm:p-16"
              aria-hidden="true"
            />

            {/* Dropzone content */}
            <Div className="relative z-10 flex flex-col items-center gap-3 px-6 py-8">
              <Icon name="lucide:Upload" className="w-10 h-10 text-muted-foreground" />
              <P className="font-semibold text-base">
                {isDragActive ? t('uploader.dropHere') : t('uploader.dragDrop')}
              </P>
              <P className="text-sm text-muted-foreground">{t('uploader.clickToSelect')}</P>
              <P className="text-xs text-muted-foreground">{t('uploader.acceptedFormats')}</P>
            {isProcessing && (
              <Div className="w-full max-w-xs mt-4">
                <Progress value={uploadProgress} className="h-2" />
                <P className="text-xs text-muted-foreground mt-2">
                  {t('uploader.processing')} {uploadProgress}%
                </P>
              </Div>
            )}
          </Div>
          </Div>
        </Div>
      ) : (
        <Div>
          {/* Header */}
          <Div className="flex items-center justify-between mb-3">
            <Div className="flex items-center gap-3">
              {isImage ? (
                <Icon name="lucide:FileImage" className="w-5 h-5 text-primary" />
              ) : (
                <Icon name="lucide:FileText" className="w-5 h-5 text-destructive" />
              )}
              <Div>
                <Div className="font-medium">{uploadedFile?.name}</Div>
                <Div className="text-xs ">
                  {(uploadedFile?.size ? uploadedFile.size / 1024 / 1024 : 0).toFixed(2)} MB
                </Div>
              </Div>
            </Div>
            <Div className="flex items-center gap-2">
              {/* Edit button for re-cropping */}
              {isImage && !isEditing && (
                <Button
                  onClick={() => {
                    // Revenir à l'image originale pour un nouveau crop
                    if (originalPreview) {
                      setPreview(originalPreview)
                    }
                    setIsEditing(true)
                    onEditingChange?.(true)
                    // Reset crop state for new editing session
                    setRotation(0)
                    setZoom(1)
                    setCrop({ x: 0, y: 0 })
                    setCroppedAreaPixels(null)
                  }}
                  variant="outline"
                  size="sm"
                  aria-label="Edit/Crop image"
                  type="button"
                >
                  <Icon name="lucide:Edit3" className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />
                  <Span className="hidden sm:inline">{t('uploader.edit')}</Span>
                </Button>
              )}
              <Button
                onClick={removeFile}
                variant="ghost"
                size="sm"
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1"
                aria-label="Remove file"
                type="button"
              >
                <Icon name="lucide:X" className="w-6 h-6 sm:w-5 sm:h-5 text-muted-foreground" />
              </Button>
            </Div>
          </Div>

          {/* Image preview when not editing */}
          {preview && isImage && !isEditing && (
            <Div className="mb-4 space-y-3">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto max-h-64 object-contain rounded border"
              />
              {/* AI validation badge — shown below the preview */}
              <ValidationBadge result={validationResult} isLoading={isValidating} t={t} />
            </Div>
          )}

          {/* Image editor (minimal) */}
          {preview && isImage && isEditing && (
            <Div className="space-y-4">
              <Div className="relative w-full overflow-hidden rounded border h-80 sm:h-96 md:h-[420px]">
                <Cropper
                  image={preview}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={undefined}
                  cropSize={{ width: cropWidth, height: cropHeight }}
                  restrictPosition={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  objectFit="contain"
                  showGrid={false}
                  minZoom={0.1}
                  maxZoom={3}
                />
              </Div>

              {/* Controls: ONLY zoom, rotation, width, height */}
              <Div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {/* Zoom */}
                <Div className="space-y-2">
                  <label className="text-xs sm:text-sm block">{t('uploader.zoom')}</label>
                  <Div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={e => setZoom(Number(e.target.value))}
                      className="w-full h-8 sm:h-6 appearance-none bg-transparent cursor-pointer
                        [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full
                        [&::-webkit-slider-runnable-track]:bg-gradient-to-r [&::-webkit-slider-runnable-track]:from-fengshui-primary
                        [&::-webkit-slider-runnable-track]:to-fengshui-secondary
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                        sm:[&::-webkit-slider-thumb]:w-5 sm:[&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-fengshui-primary
                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:-mt-2 sm:[&::-webkit-slider-thumb]:-mt-1.5
                        [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    />
                    <Span className="text-xs w-10 text-right">{zoom.toFixed(1)}x</Span>
                  </Div>
                </Div>

                {/* Rotation */}
                <Div className="space-y-2">
                  <label className="text-xs sm:text-sm block">{t('uploader.rotation')}</label>
                  <Div className="flex items-center gap-2 w-full">
                    <Button
                      onClick={() => setRotation(prev => prev - 90)}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 sm:h-9"
                    >
                      - 90°
                      <Icon name="lucide:RotateCcw" className="w-5 h-5 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      onClick={() => setRotation(prev => prev + 90)}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 sm:h-9"
                    >
                      + 90°
                      <Icon name="lucide:RotateCw" className="w-5 h-5 sm:w-4 sm:h-4" />
                    </Button>
                  </Div>
                </Div>

                {/* Width (slider + number) */}
                <Div className="flex items-center gap-3">
                  <label htmlFor="crop-width" className="text-sm w-24 flex items-center gap-1">
                    <Icon name="lucide:MoveHorizontal" className="w-5 h-5" />
                  </label>
                  <input
                    type="range"
                    min={MIN_W}
                    max={MAX_W}
                    step={10}
                    value={cropWidth}
                    onChange={e =>
                      setCropWidth(
                        Math.max(MIN_W, Math.min(MAX_W, Number(e.target.value) || MIN_W))
                      )
                    }
                    className="flex-1 appearance-none bg-transparent cursor-pointer
                      [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full
                      [&::-webkit-slider-runnable-track]:bg-gradient-to-r [&::-webkit-slider-runnable-track]:from-fengshui-primary
                      [&::-webkit-slider-runnable-track]:to-fengshui-secondary
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-fengshui-primary
                      [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:-mt-1.5
                      [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    aria-label="Crop width"
                  />
                  <Input
                    id="crop-width"
                    type="number"
                    className="w-24 text-sm"
                    value={cropWidth}
                    onChange={e =>
                      setCropWidth(
                        Math.max(MIN_W, Math.min(MAX_W, Number(e.target.value) || MIN_W))
                      )
                    }
                    min={MIN_W}
                    max={MAX_W}
                  />
                  <Span className="text-xs text-muted-foreground">px</Span>
                </Div>

                {/* Height (slider + number) */}
                <Div className="flex items-center gap-3">
                  <label htmlFor="crop-height" className="text-sm w-24 flex items-center gap-1">
                    <Icon name="lucide:MoveVertical" className="w-5 h-5" />
                  </label>
                  <input
                    type="range"
                    min={MIN_H}
                    max={MAX_H}
                    step={10}
                    value={cropHeight}
                    onChange={e =>
                      setCropHeight(
                        Math.max(MIN_H, Math.min(MAX_H, Number(e.target.value) || MIN_H))
                      )
                    }
                    className="flex-1 appearance-none bg-transparent cursor-pointer
                      [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full
                      [&::-webkit-slider-runnable-track]:bg-gradient-to-r [&::-webkit-slider-runnable-track]:from-fengshui-primary
                      [&::-webkit-slider-runnable-track]:to-fengshui-secondary
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-fengshui-primary
                      [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:-mt-1.5
                      [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    aria-label="Crop height"
                  />
                  <Input
                    id="crop-height"
                    type="number"
                    className="w-24 text-sm"
                    value={cropHeight}
                    onChange={e =>
                      setCropHeight(
                        Math.max(MIN_H, Math.min(MAX_H, Number(e.target.value) || MIN_H))
                      )
                    }
                    min={MIN_H}
                    max={MAX_H}
                  />
                  <Span className="text-xs text-muted-foreground">px</Span>
                </Div>
              </Div>

              {/* Actions */}
              <Div className="flex gap-3">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-gradient-to-r from-fengshui-primary to-fengshui-secondary hover:from-fengshui-primary-dark hover:to-fengshui-secondary-dark text-white shadow-lg hover:shadow-xl transition-all text-base font-semibold py-3"
                  type="button"
                >
                  <Icon name="lucide:Check" className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  {t('uploader.apply')}
                </Button>
                <Button variant="outline" onClick={handleCancel} type="button">
                  <Icon name="lucide:X" className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  {t('uploader.cancel')}
                </Button>
              </Div>
            </Div>
          )}

        </Div>
      )}
    </Div>
  )
}

export default PlanUploader
