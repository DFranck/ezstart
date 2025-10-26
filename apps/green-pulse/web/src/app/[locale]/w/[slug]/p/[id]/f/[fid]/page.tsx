'use client'

import { FormFillingInterface } from '@/components/forms/FormFillingInterface'
import { use } from 'react'

interface PageProps {
  params: Promise<{ slug: string; id: string; fid: string; locale: string }>
}

export default function FormFillingPage({ params }: PageProps) {
  const { slug, id, fid } = use(params)

  return (
    <>
      <FormFillingInterface workspaceSlug={slug} projectId={id} formInstanceId={fid} />
    </>
  )
}
