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
  Div,
  H1,
  Icon,
  Input,
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

interface Analysis {
  _id: string
  userId: string
  planId: string
  name: string
  bearing: number
  results: Record<string, unknown>
  imageData?: string
  createdAt: string
  updatedAt: string
}

interface AnalysesResponse {
  data: Analysis[]
  meta: { total: number; limit: number; offset: number }
}

export default function PlansPage() {
  const t = useTranslations('plans')
  const tc = useTranslations('common')
  const { user, isAuthenticated } = useAuth()
  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Analysis | null>(null)
  const limit = 12

  const isAdmin =
    user?.globalRoles?.includes('superadmin') ||
    user?.globalRoles?.includes('admin') ||
    user?.appRoles?.fengshui?.includes('admin') ||
    false

  const { data, isLoading } = useQuery<AnalysesResponse>({
    queryKey: ['analyses', page, filterUserId],
    queryFn: async () => {
      const query: Record<string, string | number> = {
        limit,
        offset: page * limit,
      }
      if (filterUserId) query.userId = filterUserId
      const envelope = await callApi<{ data: Analysis[]; meta: AnalysesResponse['meta'] }>(
        '/analyses',
        { method: 'GET', query, preserveEnvelope: true }
      )
      return { data: envelope.data, meta: envelope.meta }
    },
    enabled: isAuthenticated,
  })

  const deleteMutation = useMutation({
    mutationFn: (analysisId: string) => callApi(`/analyses/${analysisId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] })
      toast.success(t('deleteConfirm.success'))
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error(t('deleteConfirm.error'))
    },
  })

  const analyses = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  const filteredAnalyses = search
    ? analyses.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : analyses

  // --- Auth loading state ---
  if (!isHydrated) {
    return (
      <Section className="container mx-auto px-4 py-8 max-w-6xl">
        <Div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </Div>
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
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

  // --- Unauthenticated state ---
  if (!isAuthenticated) {
    return (
      <Section className="container mx-auto px-4 py-8 max-w-6xl">
        <Div className="flex items-center justify-between mb-8">
          <H1 size="h2" className="font-bold">
            {t('title')}
          </H1>
        </Div>
        <Card variant="ghost" className="max-w-md mx-auto text-center">
          <CardContent className="py-16 space-y-6">
            <Div className="flex justify-center">
              <Div className="rounded-full bg-muted p-6">
                <Icon name="lucide:Lock" className="w-12 h-12 text-muted-foreground" />
              </Div>
            </Div>
            <Div className="space-y-2">
              <P className="text-lg font-semibold">{t('guest.title')}</P>
              <P className="text-muted-foreground">{t('guest.description')}</P>
            </Div>
            <Div className="flex flex-col items-center gap-3">
              <LoginButton size="lg" alwaysShowText>
                {t('guest.login')}
              </LoginButton>
              <Link href="/analyze">
                <Button variant="outline">
                  <Icon name="lucide:Sparkles" className="w-4 h-4 mr-2" />
                  {t('newAnalysis')}
                </Button>
              </Link>
            </Div>
          </CardContent>
        </Card>
      </Section>
    )
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <Section className="container mx-auto px-4 py-8 max-w-6xl">
        <Div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </Div>
        <Div className="flex items-center gap-6 mb-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-52" />
        </Div>
        <Div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-64" />
        </Div>
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 pt-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </Div>
      </Section>
    )
  }

  const isEmpty = filteredAnalyses.length === 0 && total === 0

  // --- Authenticated dashboard ---
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

      {/* Stats bar */}
      <Div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
        <Span className="flex items-center gap-2">
          <Icon name="lucide:BarChart3" className="w-4 h-4" />
          {t('stats.totalAnalyses', { count: total })}
        </Span>
        {analyses?.[0] && (
          <Span className="flex items-center gap-2">
            <Icon name="lucide:Clock" className="w-4 h-4" />
            {t('stats.lastActivity')}: {new Date(analyses[0].createdAt).toLocaleDateString()}
          </Span>
        )}
      </Div>

      {/* Filters */}
      <Div className="flex items-center gap-3 mb-6">
        <Input
          placeholder={t('filters.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {isAdmin && (
          <Input
            placeholder={t('filters.byUser')}
            value={filterUserId}
            onChange={e => setFilterUserId(e.target.value)}
            className="max-w-xs"
          />
        )}
      </Div>

      {/* Empty state */}
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

      {/* No results from search filter */}
      {!isEmpty && filteredAnalyses.length === 0 && (
        <Card variant="ghost" className="max-w-md mx-auto text-center">
          <CardContent className="py-12 space-y-4">
            <Icon name="lucide:Search" className="w-10 h-10 text-muted-foreground mx-auto" />
            <P className="text-muted-foreground">{t('filters.noResults')}</P>
          </CardContent>
        </Card>
      )}

      {/* Analyses Grid */}
      {filteredAnalyses.length > 0 && (
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnalyses.map(analysis => (
            <Card key={analysis._id} className="overflow-hidden hover:shadow-md transition-shadow">
              {analysis.imageData && (
                <Div className="relative h-40 bg-muted">
                  <img
                    src={analysis.imageData}
                    alt={analysis.name}
                    className="w-full h-full object-cover"
                  />
                </Div>
              )}
              <CardContent className="p-4 space-y-3">
                <Div className="flex items-start justify-between gap-2">
                  <Div>
                    <Span className="font-semibold text-sm line-clamp-1">{analysis.name}</Span>
                    <P className="text-xs text-muted-foreground mt-1">
                      {t('card.bearing', { bearing: Math.round(analysis.bearing) })}
                    </P>
                  </Div>
                  <Badge variant="outline">
                    <Icon name="lucide:Compass" className="w-3 h-3 mr-1" />
                    {Math.round(analysis.bearing)}
                  </Badge>
                </Div>

                <Div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <Span className="flex items-center gap-1">
                    <Icon name="lucide:Calendar" className="w-3 h-3" />
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </Span>
                </Div>

                <Div className="flex gap-2">
                  <Link href={`/analyze/${analysis._id}`} className="flex-1">
                    <Button size="sm" className="w-full" variant="outline">
                      <Icon name="lucide:Eye" className="w-3 h-3 mr-1" />
                      {t('card.viewAnalysis')}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(analysis)}
                  >
                    <Icon name="lucide:Trash2" className="w-3 h-3" />
                  </Button>
                </Div>
              </CardContent>
            </Card>
          ))}
        </Div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <Icon name="lucide:ChevronLeft" className="w-4 h-4" />
          </Button>
          <Span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </Span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            <Icon name="lucide:ChevronRight" className="w-4 h-4" />
          </Button>
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
