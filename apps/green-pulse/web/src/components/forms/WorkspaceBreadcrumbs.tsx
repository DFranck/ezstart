'use client'

import Link from 'next/link'
import { Nav, P, Span } from '@ezstart/ui/components'

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
    <Nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap overflow-x-auto">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        📋 Dashboard
      </Link>

      <Span>/</Span>

      <Link href={`/w/${workspaceSlug}`} className="hover:text-foreground transition-colors">
        {workspaceSlug}
      </Link>

      {projectId && (
        <>
          <Span>/</Span>
          {formId ? (
            <Link
              href={`/w/${workspaceSlug}/p/${projectId}`}
              className="hover:text-foreground transition-colors"
            >
              {projectName || 'Project'}
            </Link>
          ) : (
            <Span className="text-foreground font-medium">{projectName || 'Project'}</Span>
          )}
        </>
      )}

      {formId && (
        <>
          <Span>/</Span>
          <Span className="text-foreground font-medium">{formName || 'Form'}</Span>
        </>
      )}
    </Nav>
  )
}
