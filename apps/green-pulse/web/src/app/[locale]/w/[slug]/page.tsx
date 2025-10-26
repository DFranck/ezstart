import { Suspense } from 'react'
import { H1, P, Card, CardContent } from '@ezstart/ui/components'
import { ProjectsList } from '@/components/forms/ProjectsList'
import { CreateProjectDialog } from '@/components/forms/CreateProjectDialog'
import { WorkspaceBreadcrumbs } from '@/components/forms/WorkspaceBreadcrumbs'

interface PageProps {
  params: Promise<{ slug: string; locale: string }>
}

export default async function WorkspacePage({ params }: PageProps) {
  const { slug } = await params

  return (
    <div className="container mx-auto py-8 px-4">
      <WorkspaceBreadcrumbs workspaceSlug={slug} />

      <div className="flex items-center justify-between mb-8 mt-4">
        <div>
          <H1 size="h2" className="mb-2">
            Projects
          </H1>
          <P className="text-muted-foreground">
            Manage your inspection cases and forms
          </P>
        </div>

        <CreateProjectDialog workspaceSlug={slug} />
      </div>

      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsList workspaceSlug={slug} />
      </Suspense>
    </div>
  )
}

function ProjectsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-6 w-1/3 bg-muted rounded mb-2 animate-pulse" />
            <div className="h-4 w-full bg-muted rounded mb-4 animate-pulse" />
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
