import { Div } from '@ezstart/ui/components'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Div className="min-h-screen flex items-center justify-center bg-background">{children}</Div>
  )
}
