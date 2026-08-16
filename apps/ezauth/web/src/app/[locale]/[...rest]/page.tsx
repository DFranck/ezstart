import { notFound } from 'next/navigation'

/**
 * Catch-all route under `[locale]` — funnels every unknown URL through the
 * locale layout so it triggers `[locale]/not-found.tsx` (with chrome + i18n)
 * instead of the default Next.js root 404 page (no chrome, English-only).
 *
 * Without this file, Next.js falls through to its built-in 404 handler which
 * renders the unstyled `"This page could not be found."` page — bypassing the
 * locale's `<html>`/`<body>` layout, the AppShell, and any translations.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found#data-fetching
 */
export default function CatchAllNotFound(): never {
  notFound()
}
