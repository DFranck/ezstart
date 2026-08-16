'use client'
import { AuthProvider } from '@ezstart/auth-sdk'
import type { ReactNode } from 'react'

export const EZAuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AuthProvider
      appName="ezbill"
      // Phase A1 ENV-DIET (2026-05-05) — `apiUrl` is OPTIONAL in production
      // (SDK ships `https://ezauth-api.ezstart.xyz` as a hardcoded default).
      // The prop is still threaded so dev / staging consumers can override
      // via `NEXT_PUBLIC_EZAUTH_API_URL` in their `.env.local`. `webUrl` is
      // auto-resolved from `/keys/config.webUrl` (Phase 3 ENV-DIET 2026-05-05).
      apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL}
      publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
    >
      {children}
    </AuthProvider>
  )
}
