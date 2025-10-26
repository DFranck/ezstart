'use client'
import { useTranslations } from 'next-intl'

import { useProjects } from '@/hooks/useProjects'
import { Card, CardContent, H3, P, Badge, Button } from '@ezstart/ui/components'
import Link from 'next/link'

interface ProjectsListProps {
  workspaceSlug: string
}

export function ProjectsList({ workspaceSlug }: ProjectsListProps) {
  const { data, isLoading, error } = useProjects('demo-user-1')
  const t = useTranslations('forms.projects')

  if (isLoading) {
    return <div>Loading projects...</div>
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

  const projects = data?.data || []

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <H3 size="h4" className="mb-2">
            {t('noProjects')}
          </H3>
          <P className="text-muted-foreground mb-4">
            {t('noProjectsDescription')}
          </P>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project: any) => (
        <Link
          key={project._id}
          href={`/w/${workspaceSlug}/p/${project._id}`}
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <H3 size="h4" className="mb-2">
                    📁 {project.name}
                  </H3>
                  {project.description && (
                    <P className="text-sm text-muted-foreground">{project.description}</P>
                  )}
                </div>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>

              {project.companyName && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Company:</span>
                    <span className="font-medium">{project.companyName}</span>
                  </div>
                  {project.companySector && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Sector:</span>
                      <span>{project.companySector}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>👥 {project.members?.length || 0} members</span>
                <span>📄 {project.formConfigIds?.length || 0} form types</span>
                {project.updatedAt && (
                  <span>
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
