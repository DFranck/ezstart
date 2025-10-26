import { Suspense } from 'react'
import { H1, P, Card, CardContent } from '@ezstart/ui/components'
import { ProjectDetails } from '@/components/forms/ProjectDetails'
import { FormInstancesList } from '@/components/forms/FormInstancesList'
import { CreateFormInstanceDialog } from '@/components/forms/CreateFormInstanceDialog'

interface PageProps {
  params: Promise<{ slug: string; id: string; locale: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug, id } = await params

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<div className="h-6 w-64 bg-muted rounded mb-4 animate-pulse" />}>
        <ProjectDetails projectId={id} workspaceSlug={slug} />
      </Suspense>

      <div className="flex items-center justify-between mb-6 mt-8">
        <div>
          <H1 size="h3" className="mb-1">
            Form Instances
          </H1>
          <P className="text-sm text-muted-foreground">
            Forms filled for this project
          </P>
        </div>

        <CreateFormInstanceDialog projectId={id} workspaceSlug={slug} />
      </div>

      <Suspense fallback={<FormsListSkeleton />}>
        <FormInstancesList projectId={id} workspaceSlug={slug} />
      </Suspense>
    </div>
  )
}

function FormsListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-5 w-1/3 bg-muted rounded mb-2 animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
