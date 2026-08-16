import { Main } from '@ezstart/ui/components'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Main className="h-[100dvh] overflow-hidden flex items-center justify-center bg-background p-4">
      {children}
    </Main>
  )
}
