import type { ReactNode } from 'react'
import { Div } from '@ezstart/ui/components'
import { ComponentSidebar } from './_components/ComponentSidebar'
import { CommandPalette } from './_components/CommandPalette'
import { ShowcaseTopBar } from './_components/ShowcaseTopBar'

// The showcase mounts client-only widgets (Radix Dialog command palette,
// dynamic demo imports with React.lazy) that hit React Context during
// prerender ("Cannot read properties of null (reading 'useContext')").
// Render dynamically — this is a developer-tools page, SSR-on-demand is
// fine, no SEO benefit from static prerender.
export const dynamic = 'force-dynamic'

/**
 * Layout for the `/{locale}/components` SDK showcase. The route is marked
 * `bare` in the middleware so the public AppShell short-circuits; this
 * file owns the full chrome (top bar + sidebar + content) — pattern
 * Stripe API Reference / Vercel SDK docs / Clerk components.
 *
 * Top bar: back-to-EZAuth link + theme + locale + LoginButton.
 * Sidebar:  registry-driven tree (categories collapsible).
 * Cmd+K:    mounted globally so the palette works on every showcase page.
 */
export default function ComponentsShowcaseLayout({ children }: { children: ReactNode }) {
  return (
    <Div className="relative flex min-h-screen w-full flex-col">
      <ShowcaseTopBar />
      <Div className="relative flex flex-1 w-full">
        <ComponentSidebar />
        <Div className="flex flex-1 flex-col min-w-0 bg-background">
          <Div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</Div>
        </Div>
      </Div>
      <CommandPalette />
    </Div>
  )
}
