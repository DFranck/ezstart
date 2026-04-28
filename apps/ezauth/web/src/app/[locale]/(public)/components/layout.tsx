import type { ReactNode } from 'react'
import { Div } from '@ezstart/ui/components'
import { ComponentSidebar } from './_components/ComponentSidebar'
import { CommandPalette } from './_components/CommandPalette'

// The showcase mounts client-only widgets (Radix Dialog command palette,
// dynamic demo imports with React.lazy) that hit React Context during
// prerender ("Cannot read properties of null (reading 'useContext')").
// Render dynamically — this is a developer-tools page, SSR-on-demand is
// fine, no SEO benefit from static prerender.
export const dynamic = 'force-dynamic'

/**
 * Layout for the `/{locale}/components` SDK showcase. Uses a custom
 * 2-column shell (sidebar + content) instead of `DashboardLayout` so the
 * public AppShell header stays sticky on top.
 *
 * The sidebar reads the auth-sdk registry and renders a tree of categories
 * with components. Mobile = drawer (toggle inside the sidebar). The
 * `<CommandPalette>` component is mounted here so `Cmd+K` works on every
 * showcase page.
 */
export default function ComponentsShowcaseLayout({ children }: { children: ReactNode }) {
  return (
    <Div className="relative flex min-h-[calc(100vh-3.5rem)] w-full">
      <ComponentSidebar />
      <Div className="flex flex-1 flex-col min-w-0 bg-background">
        <Div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</Div>
      </Div>
      <CommandPalette />
    </Div>
  )
}
