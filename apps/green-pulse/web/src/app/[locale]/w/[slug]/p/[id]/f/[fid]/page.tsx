import { FormFillingInterface } from '@/components/forms/FormFillingInterface'

interface PageProps {
  params: Promise<{ slug: string; id: string; fid: string; locale: string }>
}

export default async function FormFillingPage({ params }: PageProps) {
  const { slug, id, fid } = await params

  return (
    <FormFillingInterface
      workspaceSlug={slug}
      projectId={id}
      formInstanceId={fid}
    />
  )
}
