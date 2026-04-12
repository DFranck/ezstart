'use client'

import { Div } from '@ezstart/ui/components'
import type { ReactNode } from 'react'

interface AuthErrorBannerProps {
  children: ReactNode
  className?: string
}

/**
 * Reusable destructive error banner for auth forms, modals and settings pages.
 * Uses semantic theme colors (destructive) for dark/light mode support.
 */
export function AuthErrorBanner({ children, className }: AuthErrorBannerProps) {
  return (
    <Div
      role="alert"
      className={`bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm ${
        className ?? ''
      }`}
    >
      {children}
    </Div>
  )
}
