'use client'

import { Icon } from '@ezstart/ui/components'
import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface PlanUploaderProps {
  onPlanUpload: (file: File, preview: string) => void
  className?: string
}

export function PlanUploader({ onPlanUpload, className = '' }: PlanUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploadedFile(file)

      // Créer un aperçu pour les images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = e => {
          const result = e.target?.result as string
          setPreview(result)
          // Appeler onPlanUpload immédiatement pour les images
          onPlanUpload(file, result)
        }
        reader.readAsDataURL(file)
      } else {
        // Pour les PDF, on utilise une icône par défaut
        setPreview('/api/pdf-preview')
        onPlanUpload(file, '/api/pdf-preview')
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
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const startEditing = () => {
    if (uploadedFile?.type.startsWith('image/')) {
      setIsEditing(true)
    }
  }

  const applyChanges = () => {
    if (canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Définir la taille du canvas
      canvas.width = 800
      canvas.height = 600

      // Effacer le canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Sauvegarder l'état du contexte
      ctx.save()

      // Déplacer au centre du canvas
      ctx.translate(canvas.width / 2, canvas.height / 2)

      // Appliquer la rotation
      ctx.rotate((rotation * Math.PI) / 180)

      // Appliquer l'échelle
      ctx.scale(scale, scale)

      // Dessiner l'image
      const imgWidth = imageRef.current.naturalWidth
      const imgHeight = imageRef.current.naturalHeight
      const aspectRatio = imgWidth / imgHeight

      let drawWidth = 400
      let drawHeight = 400 / aspectRatio

      ctx.drawImage(
        imageRef.current,
        -drawWidth / 2 + position.x,
        -drawHeight / 2 + position.y,
        drawWidth,
        drawHeight
      )

      // Restaurer l'état du contexte
      ctx.restore()

      // Convertir le canvas en blob et créer un nouveau fichier
      canvas.toBlob(blob => {
        if (blob) {
          const newFile = new File([blob], uploadedFile!.name, { type: 'image/png' })
          const newPreview = canvas.toDataURL('image/png')

          setUploadedFile(newFile)
          setPreview(newPreview)
          setIsEditing(false)
          onPlanUpload(newFile, newPreview)
        }
      }, 'image/png')
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setRotation(0)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleRotate = (direction: 'left' | 'right') => {
    setRotation(prev => prev + (direction === 'left' ? -90 : 90))
  }

  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prev => {
      const newScale = direction === 'in' ? prev * 1.1 : prev * 0.9
      return Math.max(0.5, Math.min(3, newScale))
    })
  }

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    setPosition(prev => {
      const step = 10
      switch (direction) {
        case 'up':
          return { ...prev, y: prev.y - step }
        case 'down':
          return { ...prev, y: prev.y + step }
        case 'left':
          return { ...prev, x: prev.x - step }
        case 'right':
          return { ...prev, x: prev.x + step }
        default:
          return prev
      }
    })
  }

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
                {uploadedFile.type.startsWith('image/') ? (
                  <Icon name="lucide:FileImage" className="w-6 h-6 text-blue-500" />
                ) : (
                  <Icon name="lucide:FileText" className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-gray-700">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {uploadedFile.type.startsWith('image/') && !isEditing && (
                  <button
                    onClick={startEditing}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <Icon name="lucide:Edit" className="w-4 h-4" />
                    <span>Éditer</span>
                  </button>
                )}
                <button
                  onClick={removeFile}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <Icon name="lucide:X" className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {isEditing && uploadedFile.type.startsWith('image/') ? (
              <div className="space-y-4">
                {/* Contrôles d'édition */}
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800 mb-3">Éditer l'image</h4>

                  {/* Rotation */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rotation</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRotate('left')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600 w-16 text-center">{rotation}°</span>
                      <button
                        onClick={() => handleRotate('right')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon name="lucide:RotateCw" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Zoom */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleZoom('out')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon name="lucide:ZoomOut" className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600 w-16 text-center">
                        {Math.round(scale * 100)}%
                      </span>
                      <button
                        onClick={() => handleZoom('in')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon name="lucide:ZoomIn" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Déplacement */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Déplacement
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-w-32">
                      <div></div>
                      <button
                        onClick={() => handleMove('up')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon name="lucide:ChevronUp" className="w-4 h-4" />
                      </button>
                      <div></div>
                      <button
                        onClick={() => handleMove('left')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon name="lucide:ChevronLeft" className="w-4 h-4" />
                      </button>
                      <div className="p-2 bg-gray-50 rounded-lg text-center text-xs text-gray-500">
                        Centre
                      </div>
                      <button
                        onClick={() => handleMove('right')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon name="lucide:ChevronRight" className="w-4 h-4" />
                      </button>
                      <div></div>
                      <button
                        onClick={() => handleMove('down')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon name="lucide:ChevronDown" className="w-4 h-4" />
                      </button>
                      <div></div>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={applyChanges}
                      className="flex items-center space-x-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                      <Icon name="lucide:Check" className="w-4 h-4" />
                      <span>Appliquer</span>
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center space-x-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      <Icon name="lucide:X" className="w-4 h-4" />
                      <span>Annuler</span>
                    </button>
                  </div>
                </div>

                {/* Aperçu en temps réel */}
                <div className="relative border rounded-lg overflow-hidden bg-gray-100">
                  <div
                    className="relative w-full h-64 overflow-hidden"
                    style={{
                      transform: `rotate(${rotation}deg) scale(${scale})`,
                      transformOrigin: 'center',
                    }}
                  >
                    <img
                      ref={imageRef}
                      src={preview!}
                      alt="Aperçu du plan"
                      className="w-full h-full object-contain"
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px)`,
                      }}
                    />
                  </div>
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Aperçu
                  </div>
                </div>

                {/* Canvas caché pour le rendu final */}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <>
                {preview && uploadedFile.type.startsWith('image/') && (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Aperçu du plan"
                      className="w-full h-64 object-contain rounded border"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      Plan chargé
                    </div>
                  </div>
                )}

                {uploadedFile.type === 'application/pdf' && (
                  <div className="flex items-center justify-center h-64 bg-gray-100 rounded border">
                    <div className="text-center">
                      <Icon
                        name="lucide:FileText"
                        className="w-16 h-16 text-gray-400 mx-auto mb-2"
                      />
                      <p className="text-gray-600">PDF chargé</p>
                      <p className="text-sm text-gray-500">{uploadedFile.name}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
