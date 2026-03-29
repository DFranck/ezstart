'use client'

import { useProject } from '@/hooks/useProjects'
import {
  Badge,
  Card,
  CardContent,
  Div,
  H1,
  P,
  Skeleton,
  SkeletonCard,
  Span,
} from '@ezstart/ui/components'
import { WorkspaceBreadcrumbs } from './WorkspaceBreadcrumbs'

interface ProjectDetailsProps {
  projectId: string
  workspaceSlug: string
}

export function ProjectDetails({ projectId, workspaceSlug }: ProjectDetailsProps) {
  const { data, isLoading } = useProject(projectId)

  if (isLoading) {
    return (
      <Div className="space-y-4">
        <Skeleton className="h-6 w-48" variant="shimmer" />
        <Skeleton className="h-10 w-64" variant="shimmer" />
        <Skeleton className="h-4 w-96" variant="shimmer" />
        <SkeletonCard showHeader showFooter={false} lines={3} variant="shimmer" />
      </Div>
    )
  }

  const project = data?.data

  if (!project) {
    return <P>Project not found</P>
  }

  return (
    <Div>
      <WorkspaceBreadcrumbs
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        projectName={project.name}
      />

      <Div className="mt-4 mb-6">
        <Div className="flex items-start justify-between mb-4">
          <Div className="flex-1">
            <H1 size="h2" className="mb-2">
              📁 {project.name}
            </H1>
            {project.description && <P className="text-muted-foreground">{project.description}</P>}
          </Div>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
            {project.status}
          </Badge>
        </Div>

        {(project.companyName || project.companySector || project.companyAddress) && (
          <Card>
            <CardContent className="p-4">
              <P className="text-sm font-medium mb-3">Company Information</P>
              <Div className="space-y-2 text-sm">
                {project.companyName && (
                  <Div className="flex items-center gap-2">
                    <Span className="text-muted-foreground min-w-20">Company:</Span>
                    <Span className="font-medium">{project.companyName}</Span>
                  </Div>
                )}
                {project.companySector && (
                  <Div className="flex items-center gap-2">
                    <Span className="text-muted-foreground min-w-20">Sector:</Span>
                    <Span>{project.companySector}</Span>
                  </Div>
                )}
                {project.companyAddress && (
                  <Div className="flex items-center gap-2">
                    <Span className="text-muted-foreground min-w-20">Address:</Span>
                    <Span>{project.companyAddress}</Span>
                  </Div>
                )}
              </Div>
            </CardContent>
          </Card>
        )}
      </Div>
    </Div>
  )
}
