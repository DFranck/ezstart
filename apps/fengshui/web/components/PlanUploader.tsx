// path: app/(wherever)/PlanUploader.tsx
'use client'

/**
 * File: app/.../PlanUploader.tsx
 * Note: Image crop + rotate editor using react-easy-crop
 */

import { Button, Icon } from '@ezstart/ui/components'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Cropper from 'react-easy-crop'

type Transformations = {
  rotation: number
  scale: number
  position: { x: number; y: number }
  crop?: { x: number; y: number; width: number; height: number }
  zoom?: number
}

interface PlanUploaderProps {
  onPlanUpload: (file: File, preview: string, transformations?: Transformations) => void
  className?: string
}

type CropPixels = { width: number; height: number; x: number; y: number }

export function PlanUploader({ onPlanUpload, className = '' }: PlanUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mediaSize, setMediaSize] = useState<{
    naturalWidth: number
    naturalHeight: number
  } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropPixels | null>(null)
  const [aspect, setAspect] = useState<number | undefined>(undefined) // undefined = libre

  const imgNaturalRef = useRef<{ width: number; height: number } | null>(null)

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
          setIsEditing(true) // on édite directement pour les images
          setRotation(0)
          setZoom(1)
          setCrop({ x: 0, y: 0 })
          setCroppedAreaPixels(null)
        }
        reader.readAsDataURL(file)
      } else {
        // PDF: pas d’édition ici
        setPreview('/api/pdf-preview')
        onPlanUpload(file, '/api/pdf-preview', {
          rotation: 0,
          scale: 1,
          position: { x: 0, y: 0 },
        })
      }
    },
    [onPlanUpload]
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
    setIsEditing(false)
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    setCroppedAreaPixels(null)
  }

  const onCropComplete = useCallback((_croppedArea: unknown, croppedAreaPixelsArg: CropPixels) => {
    setCroppedAreaPixels(croppedAreaPixelsArg)
  }, [])

  const handleApply = useCallback(async () => {
    if (!uploadedFile || !preview) return

    const fallback = mediaSize && {
      x: 0,
      y: 0,
      width: mediaSize.naturalWidth,
      height: mediaSize.naturalHeight,
    }

    const area = croppedAreaPixels ?? fallback
    if (!area) return // cas ultra rare

    const { file: outFile, dataUrl } = await getCroppedImg(preview, area, rotation)

    setUploadedFile(outFile)
    setPreview(dataUrl)
    setIsEditing(false)

    onPlanUpload(outFile, dataUrl, {
      rotation,
      scale: 1,
      position: { x: 0, y: 0 },
      crop: { x: area.x, y: area.y, width: area.width, height: area.height },
      zoom,
    })
  }, [uploadedFile, preview, croppedAreaPixels, rotation, zoom, onPlanUpload, mediaSize])

  const handleCancel = () => {
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    setIsEditing(false)
  }

  const isImage = useMemo(
    () => Boolean(uploadedFile && uploadedFile.type.startsWith('image/')),
    [uploadedFile]
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-2">
              <Icon name="lucide:FileImage" className="w-8 h-8 text-gray-400" />
              <Icon name="lucide:FileText" className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? 'Déposez votre plan ici' : 'Glissez-déposez votre plan'}
              </p>
              <p className="text-sm text-gray-500 mt-1">ou cliquez pour sélectionner un fichier</p>
            </div>
            <div className="text-xs text-gray-400">Formats acceptés: JPG, PNG, GIF, PDF</div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {isImage ? (
                  <Icon name="lucide:FileImage" className="w-6 h-6 text-blue-500" />
                ) : (
                  <Icon name="lucide:FileText" className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-gray-700">{uploadedFile?.name}</p>
                  <p className="text-sm text-gray-500">
                    {uploadedFile ? (uploadedFile.size / 1024 / 1024).toFixed(2) : '0.00'} MB
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Remove file"
              >
                <Icon name="lucide:X" className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* ÉDITEUR IMAGE */}
            {preview && isImage && (
              <div className="space-y-4">
                <div className="relative h-[420px] w-full overflow-hidden rounded border bg-white">
                  <Cropper
                    image={preview}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                    objectFit="contain"
                    showGrid
                    onMediaLoaded={ms => {
                      // mémorise la taille native
                      setMediaSize({
                        naturalWidth: ms.naturalWidth,
                        naturalHeight: ms.naturalHeight,
                      })
                      // 2) initialise une zone de crop par défaut = image entière
                      setCroppedAreaPixels({
                        x: 0,
                        y: 0,
                        width: ms.naturalWidth,
                        height: ms.naturalHeight,
                      })
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {isEditing ? 'Mode édition' : 'Plan chargé'}
                  </div>
                </div>

                {/* Contrôles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Icon name="lucide:Maximize" className="w-4 h-4" />
                      Zoom
                    </h3>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={e => setZoom(Number(e.target.value))}
                      className="w-full"
                      aria-label="Zoom"
                    />
                    <div className="text-xs text-gray-600 mt-1">{zoom.toFixed(2)}x</div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Icon name="lucide:RotateCw" className="w-4 h-4" />
                      Rotation
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setRotation(r => r - 90)}>
                        <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                        -90°
                      </Button>
                      <span className="text-sm font-medium text-gray-600 w-16 text-center">
                        {rotation}°
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setRotation(r => r + 90)}>
                        <Icon name="lucide:RotateCw" className="w-4 h-4" />
                        +90°
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Icon name="lucide:Ratio" className="w-4 h-4" />
                      Ratio
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={aspect === undefined ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAspect(undefined)}
                        aria-pressed={aspect === undefined}
                      >
                        Libre
                      </Button>
                      <Button
                        variant={aspect === 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAspect(1)}
                        aria-pressed={aspect === 1}
                      >
                        1:1
                      </Button>
                      <Button
                        variant={aspect === 4 / 3 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAspect(4 / 3)}
                        aria-pressed={aspect === 4 / 3}
                      >
                        4:3
                      </Button>
                      <Button
                        variant={aspect === 16 / 9 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAspect(16 / 9)}
                        aria-pressed={aspect === 16 / 9}
                      >
                        16:9
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={handleApply} className="flex-1">
                    <Icon name="lucide:Check" className="w-4 h-4" />
                    Appliquer
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <Icon name="lucide:X" className="w-4 h-4" />
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* PDF */}
            {uploadedFile?.type === 'application/pdf' && (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded border">
                <div className="text-center">
                  <Icon name="lucide:FileText" className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">PDF chargé</p>
                  <p className="text-sm text-gray-500">{uploadedFile?.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------
 * Helpers (canvas) — tu peux les déplacer dans /utils/image.ts
 * ------------------------------------------*/

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropPixels,
  rotation = 0
): Promise<{ file: File; dataUrl: string }> {
  const image = await createImage(imageSrc)
  const radians = (rotation * Math.PI) / 180

  // Canvas qui contient l’image **pivotée**
  const { width: bW, height: bH } = getRotaBoundingBox(image.width, image.height, radians)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  canvas.width = bW
  canvas.height = bH

  // Translate to center, rotate, draw
  ctx.translate(bW / 2, bH / 2)
  ctx.rotate(radians)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)
  ctx.rotate(-radians)
  ctx.translate(-bW / 2, -bH / 2)

  // Extraire la zone crop (dans le repère du canvas pivoté)
  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height)

  // Canvas final (crop)
  const outCanvas = document.createElement('canvas')
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) throw new Error('Canvas 2D context not available (out)')

  outCanvas.width = pixelCrop.width
  outCanvas.height = pixelCrop.height
  outCtx.putImageData(data, 0, 0)

  const blob: Blob = await new Promise(resolve =>
    outCanvas.toBlob(b => resolve(b as Blob), 'image/png', 1)
  )
  const file = new File([blob], 'plan-transforme.png', { type: 'image/png' })
  const dataUrl = outCanvas.toDataURL('image/png')
  return { file, dataUrl }
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

function getRotaBoundingBox(width: number, height: number, radians: number) {
  const w = Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height)
  const h = Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height)
  return { width: Math.round(w), height: Math.round(h) }
}
