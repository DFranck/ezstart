'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  P,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import type { GameType } from '@game-analyzer/types'
import { callApi } from '@/config/api'

interface PresetResult {
  preset: string
  confidence: number
  substats: number
  success: boolean
  processingTimeMs: number
}

interface BenchResult {
  success: boolean
  benchId: string
  results: PresetResult[]
  bestPreset: string | null
  image: { width: number; height: number }
}

export default function BenchPage() {
  const t = useTranslations()
  const params = useParams()
  const game = params.game as GameType

  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<BenchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBench = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('gameType', game)

      const response = await callApi<BenchResult>('/bench', {
        method: 'POST',
        body: formData,
      })

      if (response.data) {
        setResult(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bench failed')
    } finally {
      setIsLoading(false)
    }
  }, [game])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleBench(file)
  }, [handleBench])

  return (
    <Div className="container mx-auto px-4 py-8 max-w-4xl">
      <Div className="mb-8">
        <H1 className="text-2xl font-bold mb-2">{t('bench.title')}</H1>
        <P className="text-sm text-muted-foreground">{t(`games.${game}`)}</P>
      </Div>

      {/* Upload */}
      <Div className="mb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          size="lg"
          className="w-full py-6 text-lg"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isLoading ? t('bench.running') : t('bench.launch')}
        </Button>
      </Div>

      {/* Error */}
      {error && (
        <Div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 mb-6">
          <P className="text-sm text-red-600 dark:text-red-400">{error}</P>
        </Div>
      )}

      {/* Loading */}
      {isLoading && (
        <Div className="text-center py-8">
          <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <P className="text-muted-foreground">{t('bench.running')}</P>
        </Div>
      )}

      {/* Results */}
      {result && (
        <Div className="space-y-6">
          <Div className="flex items-center justify-between">
            <H2 className="text-xl font-semibold">{t('bench.results')}</H2>
            {result.bestPreset && (
              <P className="text-sm text-muted-foreground">
                {t('bench.bestPreset')}: <span className="font-medium text-foreground">{result.bestPreset}</span>
              </P>
            )}
          </Div>

          <Div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">{t('bench.preset')}</th>
                  <th className="text-right py-2 px-3 font-medium">{t('labels.confidence')}</th>
                  <th className="text-right py-2 px-3 font-medium">{t('bench.substats')}</th>
                  <th className="text-right py-2 px-3 font-medium">{t('bench.time')}</th>
                  <th className="text-center py-2 px-3 font-medium">{t('bench.status')}</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr
                    key={r.preset}
                    className={`border-b ${r.preset === result.bestPreset ? 'bg-primary/5' : ''}`}
                  >
                    <td className="py-2 px-3 font-mono">
                      {r.preset}
                      {r.preset === result.bestPreset && (
                        <span className="ml-2 text-xs text-primary font-medium">BEST</span>
                      )}
                    </td>
                    <td className="text-right py-2 px-3">{r.confidence}%</td>
                    <td className="text-right py-2 px-3">{r.substats}</td>
                    <td className="text-right py-2 px-3">{r.processingTimeMs}ms</td>
                    <td className="text-center py-2 px-3">
                      {r.success ? (
                        <span className="text-green-600 dark:text-green-400">OK</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">FAIL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Div>

          {result.image && (
            <P className="text-xs text-muted-foreground">
              {t('bench.imageSize')}: {result.image.width}x{result.image.height}px
            </P>
          )}
        </Div>
      )}
    </Div>
  )
}
