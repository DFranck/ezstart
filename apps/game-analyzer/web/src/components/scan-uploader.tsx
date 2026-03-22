'use client'

import { Button, Card, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

interface ScanUploaderProps {
  onImageSelected: (file: File) => void
  isLoading?: boolean
}

export function ScanUploader({ onImageSelected, isLoading }: ScanUploaderProps) {
  const t = useTranslations('scan')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file)
      setPreview(url)
      onImageSelected(file)
    },
    [onImageSelected]
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFile(file)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <Div className="space-y-4">
      {/* Drag & Drop Zone (desktop) */}
      <Card
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors hidden md:block ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <P className="text-muted-foreground mb-2">{t('dragDrop')}</P>
        <P className="text-sm text-muted-foreground">{t('orBrowse')}</P>
      </Card>

      {/* Mobile buttons */}
      <Div className="flex gap-3 md:hidden">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isLoading}
        >
          {t('takePhoto')}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          {t('chooseFile')}
        </Button>
      </Div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Preview */}
      {preview && (
        <Div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
          <Image src={preview} alt="Preview" fill className="object-contain" />
        </Div>
      )}
    </Div>
  )
}
