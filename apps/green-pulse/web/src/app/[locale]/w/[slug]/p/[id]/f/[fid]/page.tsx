'use client'

import { use } from 'react'
import { FormFillingInterface } from '@/components/forms/FormFillingInterface'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

interface PageProps {
  params: Promise<{ slug: string; id: string; fid: string; locale: string }>
}

export default function FormFillingPage({ params }: PageProps) {
  const { slug, id, fid } = use(params)

  return (
    <ProtectedRoute>
      <FormFillingInterface
        workspaceSlug={slug}
        projectId={id}
        formInstanceId={fid}
      />
    </ProtectedRoute>
  )
}
