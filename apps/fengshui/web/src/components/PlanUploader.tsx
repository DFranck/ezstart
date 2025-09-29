/* path: app/(wherever)/PlanUploader.tsx */
'use client'

import { getCroppedImg } from '@/utils/image'
import { Button, Icon, Input } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Cropper, { Area } from 'react-easy-crop'

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
  className?: string
}
const MIN_W = 50
const MAX_W = 800
const MIN_H = 50
const MAX_H = 400

type CropPixels = { width: number; height: number; x: number; y: number }

/* ------------------------------------------------------------------------------------------
 * Component (MINIMAL)
 * ----------------------------------------------------------------------------------------*/
export function PlanUploader({ onPlanUpload, onEditingChange, className = '' }: PlanUploaderProps) {
  const t = useTranslations()

  // File & preview
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [originalPreview, setOriginalPreview] = useState<string | null>(null) // Garder l'image originale

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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploadedFile(file)

      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = e => {
          const result = e.target?.result as string
          setPreview(result)
          setOriginalPreview(result) // Sauvegarder l'image originale
          setIsEditing(true)
          onEditingChange?.(true)
          setRotation(0)
          setZoom(1)
          setCrop({ x: 0, y: 0 })
          setCroppedAreaPixels(null)
        }
        reader.readAsDataURL(file)
      } else {
        // PDFs: no image editing; pass straight to parent
        const pdfPreview = '/api/pdf-preview'
        setPreview(pdfPreview)
        onPlanUpload(file, pdfPreview, {
          rotation: 0,
          scale: 1,
          position: { x: 0, y: 0 },
        })
      }
    },
    [onPlanUpload, onEditingChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  })

  const removeFile = () => {
    setUploadedFile(null)
    setPreview(null)
    setOriginalPreview(null)
    setIsEditing(false)
    onEditingChange?.(false)
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    setCroppedAreaPixels(null)
  }

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    // react-easy-crop's Area = { x,y,width,height }
    setCroppedAreaPixels(areaPx as CropPixels)
  }, [])

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
  }, [uploadedFile, preview, croppedAreaPixels, rotation, zoom, onPlanUpload, onEditingChange])

  const handleCancel = () => {
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    setIsEditing(false)
    onEditingChange?.(false)
  }

  const isImage = Boolean(uploadedFile && uploadedFile.type.startsWith('image/'))

  return (
    <div className={className}>
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          aria-label="Dropzone"
        >
          <input {...getInputProps()} aria-label="Select file" />
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <Icon name="lucide:FileImage" className="w-8 h-8 " />
              <Icon name="lucide:FileText" className="w-8 h-8 " />
            </div>
            <p className=" font-medium">
              {isDragActive ? t('uploader.dropHere') : t('uploader.dragDrop')}
            </p>
            <p className="text-sm ">{t('uploader.clickToSelect')}</p>
            <p className="text-xs ">{t('uploader.acceptedFormats')}</p>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {isImage ? (
                <Icon name="lucide:FileImage" className="w-5 h-5 text-blue-500" />
              ) : (
                <Icon name="lucide:FileText" className="w-5 h-5 text-red-500" />
              )}
              <div>
                <div className="font-medium">{uploadedFile?.name}</div>
                <div className="text-xs ">
                  {(uploadedFile?.size ? uploadedFile.size / 1024 / 1024 : 0).toFixed(2)} MB
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                  <Icon name="lucide:Edit3" className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{t('uploader.edit')}</span>
                </Button>
              )}
              <Button
                onClick={removeFile}
                variant="ghost"
                size="sm"
                className="p-1"
                aria-label="Remove file"
                type="button"
              >
                <Icon name="lucide:X" className="w-5 h-5 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Image preview when not editing */}
          {preview && isImage && !isEditing && (
            <div className="mb-4">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto max-h-64 object-contain rounded border"
              />
            </div>
          )}

          {/* Image editor (minimal) */}
          {preview && isImage && isEditing && (
            <div className="space-y-4">
              <div
                className="relative w-full overflow-hidden rounded border h-80 sm:h-96 md:h-[420px]"
              >
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
              </div>

              {/* Controls: ONLY zoom, rotation, width, height */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Zoom */}
                <div className="flex items-center gap-3">
                  <label className="text-sm  w-24">{t('uploader.zoom')}</label>
                  <input
                    type="range"
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs w-10 text-right">{zoom.toFixed(1)}x</span>
                </div>

                {/* Rotation */}
                <div className="flex items-center gap-3">
                  <label className="text-sm w-24">{t('uploader.rotation')}</label>
                  <div className="flex items-center gap-2 w-full">
                    <Button
                      onClick={() => setRotation(prev => prev - 90)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      - 90°
                      <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setRotation(prev => prev + 90)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      + 90°
                      <Icon name="lucide:RotateCw" className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Width (slider + number) */}
                <div className="flex items-center gap-3">
                  <label htmlFor="crop-width" className="text-sm  w-24">
                    {t('uploader.width')}
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
                    className="flex-1"
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
                  <span className="text-xs text-gray-600">px</span>
                </div>

                {/* Height (slider + number) */}
                <div className="flex items-center gap-3">
                  <label htmlFor="crop-height" className="text-sm  w-24">
                    {t('uploader.height')}
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
                    className="flex-1"
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
                  <span className="text-xs text-gray-600">px</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleApply} className="flex-1" type="button">
                  <Icon name="lucide:Check" className="w-4 h-4 mr-2" />
                  {t('uploader.apply')}
                </Button>
                <Button variant="outline" onClick={handleCancel} type="button">
                  <Icon name="lucide:X" className="w-4 h-4 mr-2" />
                  {t('uploader.cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* PDF preview (minimal) */}
          {uploadedFile?.type === 'application/pdf' && (
            <div className="flex items-center justify-center h-56 bg-gray-50 rounded border">
              <div className="text-center">
                <Icon name="lucide:FileText" className="w-14 h-14  mx-auto mb-2" />
                <p className="">{t('uploader.pdfLoaded')}</p>
                <p className="text-xs text-gray-500">{uploadedFile?.name}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PlanUploader
