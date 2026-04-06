'use client'

import { Link } from '@/i18n/navigation'
import { GRADIENT_BG } from '@/lib/theme-colors'
import { callApi } from '@/config/api'
import { useAuth, LoginButton } from '@ezstart/auth-sdk'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  Icon,
  P,
  Section,
  Skeleton,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import type { LocalPlan } from '@/lib/local-plans'

interface PlanAiValidation {
  isValid: boolean
  score: number
  feedback: string
  roomsDetected: number
}

interface Plan {
  _id: string
  name: string
  imageData?: string
  thumbnailUrl?: string
  width: number
  height: number
  aiValidation: PlanAiValidation | null
  analysisCount?: number
  createdAt: string
}

function PlansPageContent() {
  const t = useTranslations('plans')
  const tc = useTranslations('common')
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await callApi('/api/plans', { method: 'GET' })
      return res.data as Plan[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      await callApi(`/api/plans/${planId}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success(t('deleteConfirm.success'))
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error(t('deleteConfirm.error'))
    },
  })

  const getValidationBadge = (validation: PlanAiValidation | null) => {
    if (!validation) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Icon name="lucide:HelpCircle" className="w-3 h-3 mr-1" />
          {t('card.notValidated')}
        </Badge>
      )
    }
    if (validation.isValid && validation.score >= 70) {
      return (
        <Badge variant="default" className="bg-success text-success-foreground">
          <Icon name="lucide:CheckCircle" className="w-3 h-3 mr-1" />
          {t('card.validated')}
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-warning/15 text-warning">
        <Icon name="lucide:AlertTriangle" className="w-3 h-3 mr-1" />
        {t('card.poorQuality')}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Section className="container mx-auto px-4 py-8 max-w-6xl">
        <Div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </Div>
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-40 w-full rounded-t-lg" />
              <CardContent className="space-y-3 pt-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </Div>
      </Section>
    )
  }

  const isEmpty = !plans || plans.length === 0

  return (
    <Section className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <Div className="flex items-center justify-between mb-8">
        <H1 size="h2" className="font-bold">
          {t('title')}
        </H1>
        <Link href="/analyze">
          <Button className={`${GRADIENT_BG} text-white`}>
            <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
            {t('newAnalysis')}
          </Button>
        </Link>
      </Div>

      {/* Empty State */}
      {isEmpty && (
        <Card variant="ghost" className="max-w-md mx-auto text-center">
          <CardContent className="py-16 space-y-6">
            <Div className="flex justify-center">
              <Div className="rounded-full bg-muted p-6">
                <Icon name="lucide:FolderOpen" className="w-12 h-12 text-muted-foreground" />
              </Div>
            </Div>
            <Div className="space-y-2">
              <P className="text-lg font-semibold">{t('empty.title')}</P>
              <P className="text-muted-foreground">{t('empty.description')}</P>
            </Div>
            <Link href="/analyze">
              <Button size="lg" className={`${GRADIENT_BG} text-white`}>
                <Icon name="lucide:Upload" className="w-4 h-4 mr-2" />
                {t('empty.cta')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      {!isEmpty && (
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card key={plan._id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <Div className="relative h-40 bg-muted flex items-center justify-center">
                {plan.thumbnailUrl ? (
                  <img
                    src={plan.thumbnailUrl}
                    alt={plan.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon name="lucide:Image" className="w-12 h-12 text-muted-foreground/40" />
                )}
              </Div>

              <CardHeader className="pb-2">
                <Div className="flex items-start justify-between gap-2">
                  <Span className="font-semibold text-sm line-clamp-1">{plan.name}</Span>
                  {getValidationBadge(plan.aiValidation)}
                </Div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Meta info */}
                <Div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <Span className="flex items-center gap-1">
                    <Icon name="lucide:BarChart3" className="w-3 h-3" />
                    {plan.analysisCount && plan.analysisCount > 0
                      ? t('card.analyses', { count: plan.analysisCount })
                      : t('card.noAnalyses')}
                  </Span>
                  <Span className="flex items-center gap-1">
                    <Icon name="lucide:Calendar" className="w-3 h-3" />
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </Span>
                </Div>

                {/* Actions */}
                <Div className="flex gap-2">
                  <Link href="/analyze" className="flex-1">
                    <Button size="sm" className="w-full" variant="outline">
                      <Icon name="lucide:Sparkles" className="w-3 h-3 mr-1" />
                      {t('card.analyze')}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(plan)}
                  >
                    <Icon name="lucide:Trash2" className="w-3 h-3" />
                  </Button>
                </Div>
              </CardContent>
            </Card>
          ))}
        </Div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        variant="destructive"
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirm.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
            >
              {deleteMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Icon name="lucide:Trash2" className="w-4 h-4 mr-2" />
              )}
              {t('card.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  )
}

export default function PlansPage() {
  const t = useTranslations('plans')
  const { isAuthenticated } = useAuth()

  // Not logged in — show incentive to login, not a blocker
  if (!isAuthenticated) {
    return (
      <Section className="container mx-auto px-4 py-8 max-w-6xl">
        <Div className="flex items-center justify-between mb-8">
          <H1 size="h2" className="font-bold">{t('title')}</H1>
          <Link href="/analyze">
            <Button className={`${GRADIENT_BG} text-white`}>
              <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
              {t('newAnalysis')}
            </Button>
          </Link>
        </Div>

        <Card variant="ghost" className="max-w-lg mx-auto text-center">
          <CardContent className="py-12 space-y-6">
            <Div className="flex justify-center">
              <Div className="rounded-full bg-muted p-6">
                <Icon name="lucide:CloudOff" className="w-10 h-10 text-muted-foreground" />
              </Div>
            </Div>
            <Div className="space-y-2">
              <P className="text-lg font-semibold">{t('guest.title')}</P>
              <P className="text-muted-foreground">{t('guest.description')}</P>
            </Div>
            <Div className="flex flex-col sm:flex-row gap-3 justify-center">
              <LoginButton size="lg" alwaysShowText>
                {t('guest.login')}
              </LoginButton>
              <Link href="/analyze">
                <Button variant="outline" size="lg">
                  <Icon name="lucide:Sparkles" className="w-4 h-4 mr-2" />
                  {t('guest.tryWithout')}
                </Button>
              </Link>
            </Div>
          </CardContent>
        </Card>
      </Section>
    )
  }

  // Logged in — show saved plans
  return <PlansPageContent />
}
