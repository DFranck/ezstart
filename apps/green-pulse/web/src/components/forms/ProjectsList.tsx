'use client'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@ezstart/auth-sdk'

import { useProjects } from '@/hooks/useProjects'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Div,
  H3,
  P,
  SkeletonCard,
  Span,
} from '@ezstart/ui/components'
import Link from 'next/link'

interface ProjectsListProps {
  workspaceSlug: string
}

export function ProjectsList({ workspaceSlug }: ProjectsListProps) {
  const { user } = useAuthStore()
  const { data, isLoading, error } = useProjects(user?._id || '')
  const t = useTranslations('forms.projects')

  if (isLoading) {
    return (
      <Div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard
            key={i}
            showHeader
            showFooter={false}
            lines={3}
            variant="shimmer"
            size="lg"
          />
        ))}
      </Div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent>
          <P>Error loading projects: {error.message}</P>
        </CardContent>
      </Card>
    )
  }

  // callApi wraps response: { ok, data: { success, data: [...] } }
  type ProjectItem = {
    _id: string
    name: string
    description?: string
    status?: string
    companyName?: string
    companySector?: string
    members?: unknown[]
    formConfigIds?: unknown[]
    updatedAt?: string
  }
  const projects: ProjectItem[] =
    (data?.ok ? (data.data as { data?: ProjectItem[] })?.data : undefined) || []

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <H3 size="h4" className="mb-2">
            {t('noProjects')}
          </H3>
          <P className="text-muted-foreground mb-4">{t('noProjectsDescription')}</P>
        </CardContent>
      </Card>
    )
  }

  return (
    <Div className="space-y-4">
      {projects.map(project => (
        <Link key={project._id} href={`/w/${workspaceSlug}/p/${project._id}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <Div className="flex items-start justify-between mb-4">
                <Div className="flex-1">
                  <H3 size="h4" className="mb-2">
                    📁 {project.name}
                  </H3>
                  {project.description && (
                    <P className="text-sm text-muted-foreground">{project.description}</P>
                  )}
                </Div>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </Div>

              {project.companyName && (
                <Div className="space-y-2 text-sm">
                  <Div className="flex items-center gap-2">
                    <Span className="text-muted-foreground">Company:</Span>
                    <Span className="font-medium">{project.companyName}</Span>
                  </Div>
                  {project.companySector && (
                    <Div className="flex items-center gap-2">
                      <Span className="text-muted-foreground">Sector:</Span>
                      <Span>{project.companySector}</Span>
                    </Div>
                  )}
                </Div>
              )}

              <Div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <Span>👥 {project.members?.length || 0} members</Span>
                <Span>📄 {project.formConfigIds?.length || 0} form types</Span>
                {typeof project.updatedAt === 'string' && (
                  <Span>Updated {new Date(project.updatedAt).toLocaleDateString()}</Span>
                )}
              </Div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </Div>
  )
}
