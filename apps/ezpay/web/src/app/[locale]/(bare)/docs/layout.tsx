import type { ReactNode } from 'react'
import { Div } from '@ezstart/ui/components'
import { DocsTopBar } from './_components/DocsTopBar'

/**
 * Outer shell for the `/{locale}/docs/*` surface — the developer
 * documentation umbrella that hosts the pay-sdk component showcase,
 * the README hub, and (future) the Quickstart / REST API reference /
 * guides sub-sections.
 *
 * The route is in the `(bare)` group so the public landing AppShell
 * short-circuits; this file owns the top-level chrome (sticky top bar).
 * Sub-routes that need a sidebar (e.g. `/docs/components/*`) provide
 * their own nested layout.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <Div className="relative flex min-h-screen w-full flex-col">
      <DocsTopBar />
      <Div className="flex flex-1 w-full">{children}</Div>
    </Div>
  )
}
