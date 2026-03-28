'use client'

import { Badge, Button, Div, Input, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { use, useCallback, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { GameType } from '@game-analyzer/types'
import { RuneCardWithTemplate } from '@/components/rune-card-templates'
import type { RuneCardTemplate } from '@/components/rune-card-templates'
import { GearCard } from '@/components/gear-card'
import { ScanResultRaw } from '@/components/scan-result-raw'
import { useScanDetail } from '@/hooks/use-scan-detail'
import { callApi } from '@/config/api'

interface ScanDetailPageProps {
  params: Promise<{ id: string; locale: string; game: string }>
}

export default function ScanDetailPage({ params }: ScanDetailPageProps) {
  const { id } = use(params)
  const routeParams = useParams()
  const game = routeParams.game as GameType
  const t = useTranslations()
  const queryClient = useQueryClient()
  const { data: scan, isLoading } = useScanDetail(id)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [showDisagreeInput, setShowDisagreeInput] = useState(false)
  const [runeTemplate, setRuneTemplate] = useState<RuneCardTemplate>(() => {
    if (typeof window === 'undefined') return 'compact'
    try {
      const saved = localStorage.getItem('game-analyzer-template')
      if (saved === 'compact' || saved === 'detailed' || saved === 'gaming') return saved
    } catch {}
    return 'compact'
  })

  const handleTemplateChange = useCallback((tmpl: RuneCardTemplate) => {
    setRuneTemplate(tmpl)
    localStorage.setItem('game-analyzer-template', tmpl)
  }, [])

  async function handleDelete() {
    if (!confirm(t('scanDetail.deleteConfirm'))) return
    setIsDeleting(true)
    try {
      await callApi(`/scans/${id}`, { method: 'DELETE' })
      window.history.back()
    } catch {
      setIsDeleting(false)
    }
  }

  async function handleReanalyze() {
    setIsReanalyzing(true)
    try {
      await callApi(`/scans/${id}/reanalyze`, { method: 'POST' })
      await queryClient.invalidateQueries({ queryKey: ['scan', id] })
    } catch (e) {
      console.error('[reanalyze] Error:', e)
    } finally {
      setIsReanalyzing(false)
    }
  }

  async function handleFeedback(opinion: 'agree' | 'disagree', comment?: string) {
    try {
      await callApi(`/scans/${id}/feedback`, { method: 'POST', body: { opinion, comment } })
      await queryClient.invalidateQueries({ queryKey: ['scan', id] })
      setShowDisagreeInput(false)
      setFeedbackComment('')
    } catch (e) {
      console.error('[feedback] Error:', e)
    }
  }

  if (isLoading) {
    return (
      <Div className="container mx-auto px-4 py-8 max-w-2xl">
        <RuneCardWithTemplate template={runeTemplate} isLoading />
      </Div>
    )
  }

  if (!scan) {
    return (
      <Div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <P className="text-muted-foreground">{t('labels.noScans')}</P>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/${game}/scan`}>{t('actions.back')}</Link>
        </Button>
      </Div>
    )
  }

  const hasRuneData = scan.result && scan.gameType === 'summoners-war' && 'set' in scan.result.data
  const hasGearData = scan.result && 'manufacturer' in scan.result.data
  const hasStructuredData = hasRuneData || hasGearData

  return (
    <Div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      {/* Header: Back + Actions */}
      <Div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${game}/history`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="m15 18-6-6 6-6"/></svg>
            {t('actions.back')}
          </Link>
        </Button>

        <Div className="flex items-center gap-2">
          {scan.result?.rawText && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
              {isReanalyzing ? t('scanDetail.reanalyzing') : t('actions.reanalyze')}
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            {t('actions.delete')}
          </Button>
        </Div>
      </Div>

      {/* Thumbnail — captured screenshot */}
      {scan.thumbnail ? (
        <img src={scan.thumbnail} alt="Scanned capture" className="w-full rounded-lg" />
      ) : (
        <Div className="rounded-md bg-muted/30 border border-border px-3 py-4 text-center">
          <P className="text-sm text-muted-foreground">{t('scanDetail.noThumbnail', { defaultMessage: 'Image non disponible' })}</P>
        </Div>
      )}

      {/* Rune Card with full template */}
      {scan.result && hasRuneData && (
        <RuneCardWithTemplate
          rune={scan.result.data as any}
          analysis={scan.result.analysis}
          confidence={scan.result.confidence}
          template={runeTemplate}
        />
      )}

      {/* Gear Card (Nikke) */}
      {scan.result && hasGearData && (
        <GearCard gear={scan.result.data as any} confidence={scan.result.confidence} />
      )}

      {/* Template selector */}
      {game === 'summoners-war' && (
        <Div className="flex gap-1.5">
          {(['compact', 'detailed', 'gaming'] as const).map(tmpl => (
            <Button
              key={tmpl}
              variant={runeTemplate === tmpl ? 'default' : 'outline'}
              size="sm"
              className="text-xs capitalize"
              onClick={() => handleTemplateChange(tmpl)}
            >
              {tmpl}
            </Button>
          ))}
        </Div>
      )}

      {/* Feedback */}
      {scan.result && (
        <Div className="flex items-center gap-2">
          {scan.feedback ? (
            <Div className="flex items-center gap-2">
              <Badge className={scan.feedback.opinion === 'agree' ? 'bg-success/20 text-success-foreground border-success/40' : 'bg-destructive/20 text-destructive border-destructive/40'}>
                {scan.feedback.opinion === 'agree' ? `👍 ${t('feedback.agree')}` : `👎 ${t('feedback.disagree')}`}
              </Badge>
              {scan.feedback.comment && <P className="text-xs text-muted-foreground">{scan.feedback.comment}</P>}
            </Div>
          ) : showDisagreeInput ? (
            <Div className="flex items-center gap-2 w-full">
              <Input
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder={t('feedback.commentPlaceholder')}
                className="text-sm flex-1"
              />
              <Button size="sm" onClick={() => handleFeedback('disagree', feedbackComment)}>
                {t('feedback.send')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowDisagreeInput(false); setFeedbackComment('') }}>
                {t('feedback.cancel')}
              </Button>
            </Div>
          ) : (
            <Div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleFeedback('agree')}>👍 {t('feedback.agree')}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowDisagreeInput(true)}>👎 {t('feedback.disagree')}</Button>
            </Div>
          )}
        </Div>
      )}

      {/* Raw OCR Text — collapsible */}
      {scan.result?.rawText && (
        <ScanResultRaw
          rawText={scan.result.rawText}
          confidence={scan.result.confidence}
          parsingFailed={!hasStructuredData}
          defaultCollapsed={!!hasStructuredData}
        />
      )}
    </Div>
  )
}
