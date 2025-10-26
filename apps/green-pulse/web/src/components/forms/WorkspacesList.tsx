'use client'

import { useWorkspaces } from '@/hooks/useWorkspaces'
import { Card, CardContent, CardHeader, H3, P, Badge } from '@ezstart/ui/components'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@ezstart/auth-sdk'

export function WorkspacesList() {
  const { data, isLoading, error } = useWorkspaces()
  const { user } = useAuthStore()
  const t = useTranslations('forms.workspaces')

  // Debug logs
  console.log('[WorkspacesList] user:', user?._id)
  console.log('[WorkspacesList] data:', data)
  console.log('[WorkspacesList] isLoading:', isLoading)
  console.log('[WorkspacesList] error:', error)

  if (isLoading) {
    return <div>Loading...</div>
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
          <P className="text-muted-foreground mb-4">
            {t('noWorkspacesDescription')}
          </P>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((workspace: any) => (
        <Link key={workspace._id} href={`/w/${workspace.slug}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <H3 size="h4" className="mb-1">
                    {workspace.logoUrl ? (
                      <span className="mr-2">{workspace.logoUrl}</span>
                    ) : (
                      '🏢 '
                    )}
                    {workspace.name}
                  </H3>
                  {workspace.description && (
                    <P className="text-sm text-muted-foreground line-clamp-2">
                      {workspace.description}
                    </P>
                  )}
                </div>
                <Badge variant={workspace.currentUserRole === 'owner' ? 'default' : 'secondary'}>
                  {workspace.currentUserRole}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    📁 {workspace.projectCount || 0} project{workspace.projectCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-muted-foreground">
                    👥 {workspace.memberCount || 0} member{workspace.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <Badge variant="outline">{workspace.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
