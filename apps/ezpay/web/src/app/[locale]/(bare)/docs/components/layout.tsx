import type { ReactNode } from 'react'
import { Div } from '@ezstart/ui/components'
import { ComponentSidebar } from './_components/ComponentSidebar'
import { CommandPalette } from './_components/CommandPalette'
import { DocsInternalToggleProvider } from './_components/InternalToggleContext'

// The showcase mounts client-only widgets (Radix Dialog command palette,
// dynamic demo imports with React.lazy) that hit React Context during
// prerender ("Cannot read properties of null (reading 'useContext')").
// Render dynamically — this is a developer-tools page, SSR-on-demand is
// fine, no SEO benefit from static prerender.
export const dynamic = 'force-dynamic'

/**
 * Nested layout for the pay-sdk component showcase
 * (`/{locale}/docs/components/*`). Adds the registry-driven tree sidebar
 * and the Cmd+K command palette to the docs shell. The outer
 * `<DocsTopBar>` is provided by the parent `/docs/layout.tsx`.
 *
 * Wraps everything in the `<DocsInternalToggleProvider>` so the landing
 * page, sidebar, and command palette all share the same superadmin
 * "Show internal components" toggle state.
 */
export default function ComponentsShowcaseLayout({ children }: { children: ReactNode }) {
  return (
    <DocsInternalToggleProvider>
      <ComponentSidebar />
      <Div className="flex flex-1 flex-col min-w-0 bg-background">
        <Div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</Div>
      </Div>
      <CommandPalette />
    </DocsInternalToggleProvider>
  )
}
