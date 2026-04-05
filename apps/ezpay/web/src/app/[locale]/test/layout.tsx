'use client'

import { Main } from '@ezstart/ui/components'
import { ReactNode } from 'react'
import { AuthHeader } from '../auth-header'
import { TestGuard } from './components/test-guard'
import { TestProviderBanner } from './components/test-provider-banner'
import { TestNav } from './components/test-nav'

export default function TestLayout({ children }: { children: ReactNode }) {
  return (
    <TestGuard>
      <Main className="container mx-auto py-8 px-4 max-w-6xl">
        <AuthHeader />
        <TestProviderBanner />
        <TestNav />
        {children}
      </Main>
    </TestGuard>
  )
}
