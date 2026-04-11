/* path: app/(wherever)/PlanUploader.tsx */
'use client'

import type { AiValidationResult } from '@/types/bagua'
import { Button, Card, Div, Icon, P, Progress, Span, Spinner } from '@ezstart/ui/components'
import { ImageCropper } from '@ezstart/capture-sdk'
import { useAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

/* ------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------*/
interface PlanUploaderProps {
  onPlanUpload: (file: File, preview: string) => void
  onEditingChange?: (isEditing: boolean) => void
  onValidationResult?: (result: AiValidationResult | null) => void
  onValidate?: () => void
  className?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

/* ------------------------------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------------------------------*/
export function PlanUploader({
  onPlanUpload,
  onEditingChange,
  onValidationResult,
  onValidate,
  className = '',
}: PlanUploaderProps) {
  const t = useTranslations()
  const { isAuthenticated, accessToken } = useAuth()

  // File & preview
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [originalPreview, setOriginalPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // AI validation state
  const [validationResult, setValidationResult] = useState<AiValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showValidationOverlay, setShowValidationOverlay] = useState(false)
  const validationAbortRef = useRef<AbortController | null>(null)
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Editing state
  const [isEditing, setIsEditing] = useState(false)

  // Cleanup overlay timer on unmount
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
    }
  }, [])

  // --- Auto-crop utility ---
  const autoCropImage = useCallback(
    async (
      dataUrl: string,
      boundingBox: { top: number; left: number; bottom: number; right: number }
    ): Promise<{ croppedDataUrl: string; croppedFile: File }> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas 2D context not available'))
            return
          }

          // Convert percentages to pixels
          const x = (boundingBox.left / 100) * img.naturalWidth
          const y = (boundingBox.top / 100) * img.naturalHeight
          const w = ((boundingBox.right - boundingBox.left) / 100) * img.naturalWidth
          const h = ((boundingBox.bottom - boundingBox.top) / 100) * img.naturalHeight

          canvas.width = w
          canvas.height = h
          ctx.drawImage(img, x, y, w, h, 0, 0, w, h)

          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
          canvas.toBlob(
            blob => {
              if (!blob) {
                reject(new Error('Failed to create blob from canvas'))
                return
              }
              const file = new File([blob], 'plan-auto-cropped.jpg', { type: 'image/jpeg' })
              resolve({ croppedDataUrl, croppedFile: file })
            },
            'image/jpeg',
            0.9
          )
        }
        img.onerror = () => reject(new Error('Failed to load image for auto-crop'))
        img.src = dataUrl
      })
    },
    []
  )

  // --- AI validation + auto-crop + auto-save ---
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
          throw new Error(`Validation API error: ${response.status}`)
        }

        const json = await response.json()
        const result = json.data as AiValidationResult

        if (!controller.signal.aborted) {
          setValidationResult(result)
          onValidationResult?.(result)

          // Show validation overlay
          setShowValidationOverlay(true)
          if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)

          // Auto-dismiss for valid plans after 3s, keep overlay for invalid
          if (result.score >= 20) {
            overlayTimerRef.current = setTimeout(() => setShowValidationOverlay(false), 3000)
          }

          // Auto-crop if bounding box detected and score is acceptable
          let currentDataUrl = dataUrl
          if (result.boundingBox && result.score >= 50) {
            try {
              const { croppedDataUrl, croppedFile } = await autoCropImage(
                dataUrl,
                result.boundingBox
              )
              if (!controller.signal.aborted) {
                setPreview(croppedDataUrl)
                setUploadedFile(croppedFile)
                onPlanUpload(croppedFile, croppedDataUrl)
                toast.success(t('validation.autoCropped'))
                currentDataUrl = croppedDataUrl
              }
            } catch (cropErr) {
              logger.warn('[PlanUploader] Auto-crop failed, keeping original', cropErr)
            }
          }

          // Auto-save if authenticated and score >= 20
          const saveDataUrl = currentDataUrl
          if (isAuthenticated && result.score >= 20) {
            try {
              // Get image dimensions
              const img = new Image()
              img.src = saveDataUrl
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
                  imageData: saveDataUrl,
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                }),
              })
              toast.success(t('validation.saved'))
            } catch (saveErr) {
              logger.warn('[PlanUploader] Auto-save failed', saveErr)
            }
          } else if (!isAuthenticated && result.score >= 20) {
            try {
              const { saveLocalPlan } = await import('@/lib/local-plans')
              // Get image dimensions
              const img = new Image()
              img.src = saveDataUrl
              await new Promise<void>(resolve => {
                img.onload = () => resolve()
                if (img.complete) resolve()
              })
              saveLocalPlan({
                name: file.name,
                imageData: saveDataUrl,
                width: img.naturalWidth,
                height: img.naturalHeight,
                aiValidation: result,
              })
              toast.success(t('validation.savedLocal'))
            } catch {
              // localStorage full or unavailable — silent fail
            }
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
    [isAuthenticated, accessToken, onValidationResult, onPlanUpload, autoCropImage, t]
  )

  const handleCropComplete = useCallback(
    (dataUrl: string, file: File) => {
      setPreview(dataUrl)
      setUploadedFile(file)
      setIsEditing(false)
      onEditingChange?.(false)
      onPlanUpload(file, dataUrl)
      // No re-validation — AI already validated at upload, manual crop is user's final choice
    },
    [onPlanUpload, onEditingChange]
  )

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
        setOriginalPreview(result)
        // Don't open cropper — let AI validate + auto-crop first
        setIsEditing(false)

        // Notify parent immediately with the file
        onPlanUpload(file, result)

        // Trigger AI validation immediately on the raw image
        triggerAiValidation(result, file)

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
    [onPlanUpload, onEditingChange, onValidationResult, triggerAiValidation, t]
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
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
    setUploadedFile(null)
    setPreview(null)
    setOriginalPreview(null)
    setIsEditing(false)
    onEditingChange?.(false)
    setValidationResult(null)
    setIsValidating(false)
    setShowValidationOverlay(false)
    onValidationResult?.(null)
  }

  const handleCropCancel = () => {
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
                <Div className="flex items-center gap-2">
                  <Span className="font-medium">{uploadedFile?.name}</Span>
                  {validationResult && validationResult.score >= 50 && !showValidationOverlay && (
                    <Icon name="lucide:CheckCircle" className="w-4 h-4 text-success" />
                  )}
                </Div>
                <Div className="text-xs text-muted-foreground">
                  {(uploadedFile?.size ? uploadedFile.size / 1024 / 1024 : 0).toFixed(2)} MB
                </Div>
              </Div>
            </Div>
            <Div className="flex items-center gap-2">
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

          {/* Image preview when not editing — with overlays */}
          {preview && isImage && !isEditing && (
            <Div className="relative mb-4 flex items-center justify-center w-full max-w-2xl mx-auto">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-[50vh] object-contain rounded-xl border shadow-sm"
              />

              {/* Loading overlay — dimmed background + spinner */}
              {isValidating && (
                <Div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg z-20">
                  <Card className="p-6 text-center">
                    <Spinner size="md" />
                    <P className="mt-2 text-sm">{t('validation.analyzing')}</P>
                  </Card>
                </Div>
              )}

              {/* Validation result overlay */}
              {!isValidating && showValidationOverlay && validationResult && (
                <Div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg z-20">
                  <Card className="p-6 text-center max-w-sm">
                    {validationResult.score >= 50 ? (
                      <>
                        <Icon
                          name="lucide:CheckCircle"
                          className="w-12 h-12 text-success mx-auto"
                        />
                        <P className="font-semibold mt-3">{t('validation.validTitle')}</P>
                        <P className="text-sm text-muted-foreground mt-1">
                          {t('validation.valid', {
                            rooms: validationResult.roomsDetected,
                            score: validationResult.score,
                          })}
                        </P>
                      </>
                    ) : validationResult.score >= 20 ? (
                      <>
                        <Icon
                          name="lucide:AlertTriangle"
                          className="w-12 h-12 text-warning mx-auto"
                        />
                        <P className="font-semibold mt-3">{t('validation.poorQuality')}</P>
                        {validationResult.feedback && (
                          <P className="text-sm text-muted-foreground mt-1">
                            {validationResult.feedback}
                          </P>
                        )}
                      </>
                    ) : (
                      <>
                        <Icon
                          name="lucide:XCircle"
                          className="w-12 h-12 text-destructive mx-auto"
                        />
                        <P className="font-semibold mt-3">{t('validation.invalid')}</P>
                        {validationResult.feedback && (
                          <P className="text-sm text-muted-foreground mt-1">
                            {validationResult.feedback}
                          </P>
                        )}
                        <Div className="flex gap-2 mt-4 justify-center">
                          <Button variant="outline" size="sm" onClick={removeFile}>
                            {t('validation.reupload')}
                          </Button>
                        </Div>
                      </>
                    )}
                  </Card>
                </Div>
              )}
            </Div>
          )}

          {/* Two-button action bar: Ajuster + Valider — visible after validation, hidden during editing */}
          {preview &&
            isImage &&
            !isEditing &&
            !isValidating &&
            validationResult &&
            validationResult.score >= 20 &&
            !showValidationOverlay && (
              <>
                <Div intent="info" className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg">
                  <Icon name="lucide:Info" className="w-4 h-4 shrink-0" />
                  <P className="text-sm">{t('validation.cropHint')}</P>
                </Div>
                <Div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Button
                    onClick={() => {
                      setIsEditing(true)
                      onEditingChange?.(true)
                    }}
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    type="button"
                  >
                    <Icon name="lucide:Crop" className="w-4 h-4 mr-2" />
                    {t('validation.adjustCrop')}
                  </Button>
                  <Button
                    onClick={() => onValidate?.()}
                    variant="brand"
                    className="flex-1 min-h-[44px]"
                    type="button"
                  >
                    {t('validation.validateAndContinue')}
                  </Button>
                </Div>
              </>
            )}

          {/* Image editor */}
          {preview && isImage && isEditing && (
            <ImageCropper
              src={originalPreview ?? preview}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
              mode={validationResult?.boundingBox ? 'edge-drag' : 'pan-zoom'}
              initialCrop={
                validationResult?.boundingBox
                  ? {
                      top: validationResult.boundingBox.top,
                      left: validationResult.boundingBox.left,
                      bottom: validationResult.boundingBox.bottom,
                      right: validationResult.boundingBox.right,
                    }
                  : undefined
              }
              showRotation
              maxOutputWidth={1500}
              outputQuality={0.85}
              themeColor="var(--fengshui-primary)"
              className="w-full max-w-2xl mx-auto min-h-[350px] sm:min-h-[450px]"
              labels={{
                apply: t('uploader.apply'),
                cancel: t('uploader.cancel'),
                zoom: t('uploader.zoom'),
                rotation: t('uploader.rotation'),
              }}
            />
          )}
        </Div>
      )}
    </Div>
  )
}

export default PlanUploader
