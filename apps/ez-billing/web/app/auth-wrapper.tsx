'use client'
import { EZAuthProvider } from '@/providers/auth-provider'

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <EZAuthProvider>{children}</EZAuthProvider>
}
