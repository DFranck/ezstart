import { Main } from '@ezstart/ui/components'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Main className="min-h-screen flex items-center justify-center bg-background">{children}</Main>
  )
}
