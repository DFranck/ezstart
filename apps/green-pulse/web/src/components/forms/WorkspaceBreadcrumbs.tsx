'use client'

import Link from 'next/link'
import { P } from '@ezstart/ui/components'

interface WorkspaceBreadcrumbsProps {
  workspaceSlug: string
  projectId?: string
  projectName?: string
  formId?: string
  formName?: string
}

export function WorkspaceBreadcrumbs({
  workspaceSlug,
  projectId,
  projectName,
  formId,
  formName,
}: WorkspaceBreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        📋 Dashboard
      </Link>

      <span>/</span>

      <Link
        href={`/w/${workspaceSlug}`}
        className="hover:text-foreground transition-colors"
      >
        {workspaceSlug}
      </Link>

      {projectId && (
        <>
          <span>/</span>
          {formId ? (
            <Link
              href={`/w/${workspaceSlug}/p/${projectId}`}
              className="hover:text-foreground transition-colors"
            >
              {projectName || 'Project'}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{projectName || 'Project'}</span>
          )}
        </>
      )}

      {formId && (
        <>
          <span>/</span>
          <span className="text-foreground font-medium">{formName || 'Form'}</span>
        </>
      )}
    </nav>
  )
}
