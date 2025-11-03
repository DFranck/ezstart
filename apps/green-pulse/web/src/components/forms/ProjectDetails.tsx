'use client'

import { useProject } from '@/hooks/useProjects'
import { H1, P, Badge, Card, CardContent, SkeletonCard, Skeleton } from '@ezstart/ui/components'
import { WorkspaceBreadcrumbs } from './WorkspaceBreadcrumbs'

interface ProjectDetailsProps {
  projectId: string
  workspaceSlug: string
}

export function ProjectDetails({ projectId, workspaceSlug }: ProjectDetailsProps) {
  const { data, isLoading } = useProject(projectId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" variant="shimmer" />
        <Skeleton className="h-10 w-64" variant="shimmer" />
        <Skeleton className="h-4 w-96" variant="shimmer" />
        <SkeletonCard showHeader showFooter={false} lines={3} variant="shimmer" />
      </div>
    )
  }

  const project = data?.data

  if (!project) {
    return <P>Project not found</P>
  }

  return (
    <div>
      <WorkspaceBreadcrumbs
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        projectName={project.name}
      />

      <div className="mt-4 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <H1 size="h2" className="mb-2">
              📁 {project.name}
            </H1>
            {project.description && (
              <P className="text-muted-foreground">{project.description}</P>
            )}
          </div>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
            {project.status}
          </Badge>
        </div>

        {(project.companyName || project.companySector || project.companyAddress) && (
          <Card>
            <CardContent className="p-4">
              <P className="text-sm font-medium mb-3">Company Information</P>
              <div className="space-y-2 text-sm">
                {project.companyName && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-20">Company:</span>
                    <span className="font-medium">{project.companyName}</span>
                  </div>
                )}
                {project.companySector && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-20">Sector:</span>
                    <span>{project.companySector}</span>
                  </div>
                )}
                {project.companyAddress && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-20">Address:</span>
                    <span>{project.companyAddress}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
