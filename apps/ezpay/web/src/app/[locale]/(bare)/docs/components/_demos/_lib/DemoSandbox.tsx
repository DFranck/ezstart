'use client'

import { type ReactNode } from 'react'
import { PayProvider } from '@ezstart/pay-sdk'
import { Placeholder } from '../Placeholder'

/**
 * Wraps a demo in an isolated `<PayProvider>` configured with the
 * `_pay-docs-demo` sandbox publishable key. The nested provider creates
 * its OWN React Context, so the visitor's main pay context is never
 * mutated by interactions inside the live preview.
 *
 * When `NEXT_PUBLIC_EZPAY_DOCS_DEMO_KEY` is not set at build time
 * (typical for local dev before the seed script runs, or for forks that
 * haven't configured the sandbox yet), the wrapper degrades gracefully
 * to a neutral Placeholder explaining how to enable live previews.
 *
 * Sandbox conventions (pair with PAY_SDK_DOCS_SANDBOX-001):
 * - `applicationId="_pay-docs-demo"` — the platform-reserved Application slug
 * - Hard quotas + 24h reset cycle enforced server-side
 * - All actions taken inside the demo are real but isolated to the
 *   sandbox dataset (test-mode keys / sandbox transactions)
 */
export interface DemoSandboxProps {
  children: ReactNode
  /**
   * Component name (used in the fallback Placeholder when the demo key is
   * missing). Pass the same name as the showcase component.
   */
  componentName: string
}

const DEMO_API_URL = process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130'
const DEMO_KEY = process.env.NEXT_PUBLIC_EZPAY_DOCS_DEMO_KEY

export function DemoSandbox({ children, componentName }: DemoSandboxProps) {
  if (!DEMO_KEY) {
    return (
      <Placeholder
        name={componentName}
        reason="Live preview unavailable: NEXT_PUBLIC_EZPAY_DOCS_DEMO_KEY is not configured. Run the docs-demo seed script in apps/ezpay/api to provision the sandbox Application + publishable key, then add the key to apps/ezpay/web/.env.local."
      />
    )
  }

  return (
    <PayProvider
      appName="_pay-docs-demo"
      config={{ apiUrl: DEMO_API_URL }}
      publishableKey={DEMO_KEY}
    >
      {children}
    </PayProvider>
  )
}
