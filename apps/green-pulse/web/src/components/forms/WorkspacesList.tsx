'use client'

import { useWorkspaces } from '@/hooks/useWorkspaces'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  P,
  SkeletonCard,
  Span,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@ezstart/auth-sdk'

export function WorkspacesList() {
  const { data, isLoading, error } = useWorkspaces()
  const { user } = useAuthStore()
  const t = useTranslations('forms.workspaces')

  if (isLoading) {
    return (
      <Div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} showHeader showFooter={false} lines={2} variant="shimmer" />
        ))}
      </Div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent>
          <P>Error loading workspaces: {error.message}</P>
        </CardContent>
      </Card>
    )
  }

  // callApi wraps response: { ok, data: { success, data: { workspaces } } }
  const workspaces = data?.data?.data?.workspaces || []

  if (workspaces.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <H3 size="h4" className="mb-2">
            {t('noWorkspaces')}
          </H3>
          <P className="text-muted-foreground mb-4">{t('noWorkspacesDescription')}</P>
        </CardContent>
      </Card>
    )
  }

  return (
    <Div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((workspace: any) => (
        <Link key={workspace._id} href={`/w/${workspace.slug}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Div className="flex items-start justify-between">
                <Div className="flex-1">
                  <H3 size="h4" className="mb-1">
                    {workspace.logoUrl ? <Span className="mr-2">{workspace.logoUrl}</Span> : '🏢 '}
                    {workspace.name}
                  </H3>
                  {workspace.description && (
                    <P className="text-sm text-muted-foreground line-clamp-2">
                      {workspace.description}
                    </P>
                  )}
                </Div>
                <Badge variant={workspace.currentUserRole === 'owner' ? 'default' : 'secondary'}>
                  {workspace.currentUserRole}
                </Badge>
              </Div>
            </CardHeader>

            <CardContent>
              <Div className="flex items-center justify-between text-sm">
                <Div className="flex items-center gap-4">
                  <Span className="text-muted-foreground">
                    📁 {workspace.projectCount || 0} project
                    {workspace.projectCount !== 1 ? 's' : ''}
                  </Span>
                  <Span className="text-muted-foreground">
                    👥 {workspace.memberCount || 0} member{workspace.memberCount !== 1 ? 's' : ''}
                  </Span>
                </Div>
                <Badge variant="outline">{workspace.status}</Badge>
              </Div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </Div>
  )
}
