'use client'

import { type ReactNode } from 'react'
import { AuthProvider } from '@ezstart/auth-sdk'
import { Placeholder } from '../Placeholder'

/**
 * Wraps a demo in an isolated `<AuthProvider>` configured with the
 * `_docs-demo` sandbox publishable key. The nested provider creates its OWN
 * Zustand store via React Context, so the visitor's main session is never
 * mutated by interactions inside the live preview.
 *
 * When `NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY` is not set at build time (typical
 * for local dev before the seed script runs, or for forks that haven't
 * configured the sandbox yet), the wrapper degrades gracefully to a neutral
 * Placeholder explaining how to enable live previews.
 *
 * Sandbox conventions (DOCS_DEMO_SANDBOX_BACKEND-001):
 * - `appName="_docs-demo"` — the platform-reserved Application slug
 * - Hard quotas + 24h reset cycle enforced server-side
 * - All actions taken inside the demo are real but isolated
 */
export interface DemoSandboxProps {
  children: ReactNode
  /**
   * Component name (used in the fallback Placeholder when the demo key is
   * missing). Pass the same name as the showcase component.
   */
  componentName: string
}

const DEMO_API_URL = process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'
const DEMO_KEY = process.env.NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY

export function DemoSandbox({ children, componentName }: DemoSandboxProps) {
  if (!DEMO_KEY) {
    return (
      <Placeholder
        name={componentName}
        reason="Live preview unavailable: NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY is not configured. Run the docs-demo seed script in apps/ezauth/api to provision the sandbox Application + publishable key, then add the key to apps/ezauth/web/.env.local."
      />
    )
  }

  return (
    <AuthProvider
      appName="_docs-demo"
      authMode="httpOnly"
      mode="standard"
      publishableKey={DEMO_KEY}
      apiUrl={DEMO_API_URL}
      // Storage key isolates the sandbox store from the parent app store so
      // hot reloads + cross-tab sync don't conflict with the visitor's real
      // session in localStorage.
      storageKey="ezauth-docs-demo"
    >
      {children}
    </AuthProvider>
  )
}
