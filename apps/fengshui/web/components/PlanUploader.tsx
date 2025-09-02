/* path: app/(wherever)/PlanUploader.tsx */
'use client'

import { getCroppedImg } from '@/utils/image'
import { Button, Icon } from '@ezstart/ui/components'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Cropper from 'react-easy-crop'

/* ------------------------------------------------------------------------------------------
 * Types
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
  className?: string
}

type CropPixels = { width: number; height: number; x: number; y: number }

/* ------------------------------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------------------------------*/
export function PlanUploader({ onPlanUpload, className = '' }: PlanUploaderProps) {
  // Fichier & preview
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // États simplifiés pour l'édition
  const [isEditing, setIsEditing] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropPixels | null>(null)
  
  // Contrôle de la taille du crop
  const [cropWidth, setCropWidth] = useState(300)
  const [cropHeight, setCropHeight] = useState(200)

  // Fonction pour ajuster automatiquement le crop aux bords
  const fitToBounds = () => {
    setZoom(1)
    setCrop({ x: 0, y: 0 })
  }

  // DnD
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
          setIsEditing(true)
          setRotation(0)
          setZoom(1)
          setCrop({ x: 0, y: 0 })
          setCroppedAreaPixels(null)
        }
        reader.readAsDataURL(file)
      } else {
        // PDF: pas d'édition image; on passe direct au parent
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

  const onCropComplete = useCallback((_area: unknown, areaPx: CropPixels) => {
    setCroppedAreaPixels(areaPx)
  }, [])

  const handleApply = useCallback(async () => {
    if (!uploadedFile || !preview || !croppedAreaPixels) return

    const { file: outFile, dataUrl } = await getCroppedImg(preview, croppedAreaPixels, rotation)

    setUploadedFile(outFile)
    setPreview(dataUrl)
    setIsEditing(false)

    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })

    onPlanUpload(outFile, dataUrl, {
      rotation: 0,
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
  }, [uploadedFile, preview, croppedAreaPixels, rotation, zoom, onPlanUpload])

  const handleCancel = () => {
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    setIsEditing(false)
  }

  const isImage = Boolean(uploadedFile && uploadedFile.type.startsWith('image/'))

  return (
    <div className={`space-y-4 ${className}`}>
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          aria-label="Zone de dépôt de fichier"
        >
          <input {...getInputProps()} aria-label="Sélection de fichier" />
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
            <div className="text-xs text-gray-400">Formats acceptés : JPG, PNG, GIF, PDF</div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="border rounded-lg p-4 bg-gray-50">
            {/* En-tête fichier */}
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
                aria-label="Retirer le fichier"
                type="button"
              >
                <Icon name="lucide:X" className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* ÉDITEUR IMAGE SIMPLIFIÉ */}
            {preview && isImage && (
              <div className="space-y-4">
                {/* Viewer */}
                <div className="relative w-full overflow-hidden rounded border bg-white" style={{ height: 420 }}>
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
                    showGrid
                  />
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    Ajustez votre plan
                  </div>
                </div>

                {/* Contrôles simplifiés */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Zoom */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Icon name="lucide:ZoomIn" className="w-4 h-4" />
                        Zoom
                      </h3>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-gray-600 mt-2">{zoom.toFixed(1)}x</div>
                    </div>

                    {/* Rotation */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Icon name="lucide:RotateCw" className="w-4 h-4" />
                        Rotation
                      </h3>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRotation(r => r - 90)}
                          type="button"
                        >
                          <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                          {rotation}°
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRotation(r => r + 90)}
                          type="button"
                        >
                          <Icon name="lucide:RotateCw" className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Presets de taille */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Icon name="lucide:Maximize2" className="w-4 h-4" />
                        Presets
                      </h3>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fitToBounds}
                          type="button"
                          className="w-full"
                        >
                          <Icon name="lucide:Maximize2" className="w-4 h-4 mr-2" />
                          Ajuster aux bords
                        </Button>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setCropWidth(600); setCropHeight(200) }}
                            type="button"
                            className="text-xs"
                          >
                            Plan allongé
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setCropWidth(300); setCropHeight(300) }}
                            type="button"
                            className="text-xs"
                          >
                            Carré
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contrôles de taille du rectangle */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Largeur du rectangle */}
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Icon name="lucide:ArrowLeftRight" className="w-4 h-4" />
                        Largeur du rectangle
                      </h3>
                      <input
                        type="range"
                        min={50}
                        max={800}
                        step={10}
                        value={cropWidth}
                        onChange={e => setCropWidth(Number(e.target.value))}
                        className="w-full mb-2"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-20 rounded border px-2 py-1 text-sm"
                          value={cropWidth}
                          onChange={e => setCropWidth(Number(e.target.value) || 50)}
                          min={50}
                          max={800}
                        />
                        <span className="text-xs text-gray-600">px</span>
                      </div>
                    </div>

                    {/* Hauteur du rectangle */}
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Icon name="lucide:ArrowUpDown" className="w-4 h-4" />
                        Hauteur du rectangle
                      </h3>
                      <input
                        type="range"
                        min={50}
                        max={400}
                        step={10}
                        value={cropHeight}
                        onChange={e => setCropHeight(Number(e.target.value))}
                        className="w-full mb-2"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-20 rounded border px-2 py-1 text-sm"
                          value={cropHeight}
                          onChange={e => setCropHeight(Number(e.target.value) || 50)}
                          min={50}
                          max={400}
                        />
                        <span className="text-xs text-gray-600">px</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={handleApply} className="flex-1" type="button">
                    <Icon name="lucide:Check" className="w-4 h-4 mr-2" />
                    Valider le crop
                  </Button>
                  <Button variant="outline" onClick={handleCancel} type="button">
                    <Icon name="lucide:X" className="w-4 h-4 mr-2" />
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

export default PlanUploader
