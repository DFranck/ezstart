/* path: app/(wherever)/PlanUploader.tsx */
'use client'

import { getCroppedImg } from '@/utils/image'
import { Button, Icon } from '@ezstart/ui/components'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
type AspectPreset = 'free' | '1:1' | '4:3' | '16:9' | 'custom'

/* ------------------------------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------------------------------*/
export function PlanUploader({ onPlanUpload, className = '' }: PlanUploaderProps) {
  // Fichier & preview
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Infos image native (utile pour fallback crop)
  const [mediaSize, setMediaSize] = useState<{
    naturalWidth: number
    naturalHeight: number
  } | null>(null)

  // Éditeur
  const [isEditing, setIsEditing] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropPixels | null>(null)

  // Ratio / cadre
  const containerRef = useRef<HTMLDivElement>(null)
  const [preset, setPreset] = useState<AspectPreset>('free')
  const [customAspect, setCustomAspect] = useState<number>(NaN) // ex: 2.35 = 21:9
  const [cropSize, setCropSize] = useState<{ width: number; height: number }>()
  const [maxBox, setMaxBox] = useState<{ width: number; height: number }>({ width: 0, height: 420 })

  // Utils
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  // Ratio effectif (undefined = libre)
  const aspect = useMemo<number | undefined>(() => {
    if (preset === 'free') return undefined
    if (preset === '1:1') return 1
    if (preset === '4:3') return 4 / 3
    if (preset === '16:9') return 16 / 9
    if (preset === 'custom' && Number.isFinite(customAspect) && customAspect > 0)
      return customAspect
    return undefined
  }, [preset, customAspect])

  // Responsive : calcule la boîte disponible et initialise/contraint cropSize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      setMaxBox({ width: w, height: 420 })
      setCropSize(cs => {
        if (!cs) {
          const initH = Math.min(Math.round(w * 0.6), 420)
          const initW = aspect ? Math.round(initH * aspect) : w
          return { width: clamp(initW, 40, w), height: clamp(initH, 40, 420) }
        }
        const newW = clamp(cs.width, 40, w)
        const newH = clamp(cs.height, 40, 420)
        return { width: newW, height: newH }
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspect])

  // Quand le ratio change : recalcule l’autre dimension
  useEffect(() => {
    if (!cropSize) return
    setCropSize(cs => {
      if (!cs) return cs
      if (aspect === undefined) return cs // libre
      const newW = clamp(Math.round(cs.height * aspect), 40, maxBox.width)
      const newH = clamp(Math.round(newW / aspect), 40, maxBox.height)
      return { width: newW, height: newH }
    })
  }, [aspect, maxBox.width, maxBox.height, cropSize])

  // Contrôles taille cadre
  const setHeightPx = (h: number) => {
    setCropSize(cs => {
      if (!cs) return cs
      const height = clamp(h, 40, maxBox.height)
      if (aspect === undefined) return { ...cs, height }
      const width = clamp(Math.round(height * aspect), 40, maxBox.width)
      return { width, height: clamp(Math.round(width / aspect), 40, maxBox.height) }
    })
  }

  const setWidthPx = (w: number) => {
    setCropSize(cs => {
      if (!cs) return cs
      const width = clamp(w, 40, maxBox.width)
      if (aspect === undefined) return { ...cs, width }
      const height = clamp(Math.round(width / aspect), 40, maxBox.height)
      return { width, height }
    })
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
        // PDF: pas d’édition image; on passe direct au parent
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
    if (!uploadedFile || !preview) return

    const fallback =
      mediaSize &&
      ({
        x: 0,
        y: 0,
        width: mediaSize.naturalWidth,
        height: mediaSize.naturalHeight,
      } as CropPixels)

    const area = croppedAreaPixels ?? fallback
    if (!area) return

    // getCroppedImg découpe DANS le canvas déjà pivoté → bitmap final "baked"
    const { file: outFile, dataUrl } = await getCroppedImg(preview, area, rotation)

    setUploadedFile(outFile)
    setPreview(dataUrl)
    setIsEditing(false)

    // L’image résultante EST déjà pivotée → on repart à 0 pour une éventuelle réédition
    setRotation(0)
    setZoom(1)
    setCrop({ x: 0, y: 0 })

    onPlanUpload(outFile, dataUrl, {
      rotation: 0,
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

            {/* ÉDITEUR IMAGE */}
            {preview && isImage && (
              <div className="space-y-4">
                {/* Viewer */}
                <div
                  ref={containerRef}
                  className="relative w-full overflow-hidden rounded border bg-white"
                  style={{ height: 420 }}
                >
                  <Cropper
                    image={preview}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspect} // ratio verrouillable (undefined = libre)
                    cropSize={cropSize} // cadre redimensionnable
                    restrictPosition={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                    objectFit="contain"
                    showGrid
                    onMediaLoaded={ms => {
                      // taille native pour fallback + init zone complète
                      setMediaSize({
                        naturalWidth: ms.naturalWidth,
                        naturalHeight: ms.naturalHeight,
                      })
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

                {/* Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Presets & Custom Ratio */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Icon name="lucide:Ratio" className="w-4 h-4" /> Ratio
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(['free', '1:1', '4:3', '16:9', 'custom'] as AspectPreset[]).map(p => (
                        <Button
                          key={p}
                          size="sm"
                          variant={preset === p ? 'default' : 'outline'}
                          onClick={() => setPreset(p)}
                          aria-pressed={preset === p}
                          type="button"
                        >
                          {p === 'free' ? 'Libre' : p.toUpperCase()}
                        </Button>
                      ))}
                    </div>

                    {preset === 'custom' && (
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-sm text-gray-600" htmlFor="ratioInput">
                          Ratio (w/h) :
                        </label>
                        <input
                          id="ratioInput"
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={Number.isFinite(customAspect) ? customAspect : ''}
                          onChange={e => setCustomAspect(parseFloat(e.target.value))}
                          className="w-24 rounded border px-2 py-1 text-sm"
                          placeholder="ex : 2.35"
                          aria-label="Ratio personnalisé largeur/hauteur"
                        />
                      </div>
                    )}
                  </div>

                  {/* Crop height */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Icon name="lucide:Crop" className="w-4 h-4" /> Crop height
                    </h3>
                    <input
                      type="range"
                      min={40}
                      max={maxBox.height}
                      step={1}
                      value={cropSize?.height ?? 0}
                      onChange={e => setHeightPx(Number(e.target.value))}
                      className="w-full"
                      aria-label="Hauteur du cadre de recadrage"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        className="w-24 rounded border px-2 py-1 text-sm"
                        value={cropSize?.height ?? 0}
                        onChange={e => setHeightPx(parseInt(e.target.value || '0', 10))}
                        aria-label="Saisir la hauteur du cadre en pixels"
                      />
                      <span className="text-xs text-gray-600">px</span>
                    </div>
                  </div>

                  {/* Crop width (désactivée si ratio verrouillé) */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Icon name="lucide:Crop" className="w-4 h-4" /> Crop width
                    </h3>
                    <input
                      type="range"
                      min={40}
                      max={maxBox.width}
                      step={1}
                      value={cropSize?.width ?? 0}
                      onChange={e => setWidthPx(Number(e.target.value))}
                      className="w-full"
                      aria-label="Largeur du cadre de recadrage"
                      disabled={aspect !== undefined}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        className="w-24 rounded border px-2 py-1 text-sm"
                        value={cropSize?.width ?? 0}
                        onChange={e => setWidthPx(parseInt(e.target.value || '0', 10))}
                        aria-label="Saisir la largeur du cadre en pixels"
                        disabled={aspect !== undefined}
                      />
                      <span className="text-xs text-gray-600">px</span>
                    </div>
                    {aspect !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">Width verrouillée par le ratio.</p>
                    )}
                  </div>
                </div>

                {/* Zoom / Rotation */}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRotation(r => r - 90)}
                        type="button"
                      >
                        <Icon name="lucide:RotateCcw" className="w-4 h-4" />
                        -90°
                      </Button>
                      <span className="text-sm font-medium text-gray-600 w-16 text-center">
                        {rotation}°
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRotation(r => r + 90)}
                        type="button"
                      >
                        <Icon name="lucide:RotateCw" className="w-4 h-4" />
                        +90°
                      </Button>
                    </div>
                  </div>

                  {/* Rappel des presets (boutons rapides) */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Icon name="lucide:Shapes" className="w-4 h-4" />
                      Presets rapides
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(['free', '1:1', '4:3', '16:9'] as AspectPreset[]).map(p => (
                        <Button
                          key={`quick-${p}`}
                          size="sm"
                          variant={preset === p ? 'default' : 'outline'}
                          onClick={() => setPreset(p)}
                          aria-pressed={preset === p}
                          type="button"
                        >
                          {p === 'free' ? 'Libre' : p.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={handleApply} className="flex-1" type="button">
                    <Icon name="lucide:Check" className="w-4 h-4" />
                    Appliquer
                  </Button>
                  <Button variant="outline" onClick={handleCancel} type="button">
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

export default PlanUploader
