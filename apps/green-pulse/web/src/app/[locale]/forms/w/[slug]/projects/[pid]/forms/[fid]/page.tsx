import { Suspense } from 'react'
import { div } from '@ezstart/ui/components'
import { FormFillingInterface } from '@/components/forms/FormFillingInterface'

interface PageProps {
  params: Promise<{ slug: string; pid: string; fid: string; locale: string }>
}

export default async function FormInstancePage({ params }: PageProps) {
  const { slug, pid, fid } = await params

  return (
    <Suspense fallback={<FormFillingInterfacediv />}>
      <FormFillingInterface
        workspaceSlug={slug}
        projectId={pid}
        formInstanceId={fid}
      />
    </Suspense>
  )
}

function FormFillingInterfacediv() {
  return (
    <div className="h-screen flex">
      <div className="w-1/2 border-r p-8">
        <div className="h-8 w-64 mb-4" />
        <div className="h-96 w-full" />
      </div>
      <div className="w-1/2 p-8">
        <div className="h-8 w-48 mb-4" />
        <div className="h-full w-full" />
      </div>
    </div>
  )
}
