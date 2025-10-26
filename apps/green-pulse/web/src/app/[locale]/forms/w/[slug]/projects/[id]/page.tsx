import { Suspense } from 'react'
import { H1, P, Card, CardContent, div } from '@ezstart/ui/components'
import { ProjectDetails } from '@/components/forms/ProjectDetails'
import { FormInstancesList } from '@/components/forms/FormInstancesList'
import { CreateFormInstanceDialog } from '@/components/forms/CreateFormInstanceDialog'
import { WorkspaceBreadcrumbs } from '@/components/forms/WorkspaceBreadcrumbs'

interface PageProps {
  params: Promise<{ slug: string; id: string; locale: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug, id } = await params

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<div className="h-6 w-64 mb-4" />}>
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

      <Suspense fallback={<FormsListdiv />}>
        <FormInstancesList projectId={id} workspaceSlug={slug} />
      </Suspense>
    </div>
  )
}

function FormsListdiv() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-5 w-1/3 mb-2" />
            <div className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
