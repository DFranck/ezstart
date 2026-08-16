'use client'

/**
 * Global error boundary for the App Router root layout.
 *
 * Catches errors that escape every nested `error.tsx` boundary, including
 * errors raised during the rendering of the root `layout.tsx` itself.
 * Without this file, such errors render Next.js's default fallback (a blank
 * white page on prod) and never reach Sentry.
 *
 * **Always renders a full HTML document** — `global-error.tsx` replaces the
 * root layout entirely when it fires, so it must own `<html>` + `<body>`.
 *
 * Sentry is captured manually via `useEffect` because `global-error.tsx` is
 * a Client Component; the capture happens in the browser as soon as the
 * boundary mounts, which is the first opportunity we have.
 *
 * NOTE: we deliberately do NOT import `next/error` (the legacy Pages Router
 * fallback). It internally renders `<Html>` which Next.js 15+ refuses to
 * pre-render outside the Pages Router and breaks `next build` on the `/404`
 * fallback. Plain HTML is simpler, smaller, and fully App-Router-compatible.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-error
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#errorjs-file
 */

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Safe even when Sentry is not initialized — `captureException` is a
    // no-op until `Sentry.init` runs (gated by NEXT_PUBLIC_SENTRY_DSN).
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
          margin: 0,
          padding: '4rem 1.5rem',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#1f2937',
          background: '#ffffff',
        }}
      >
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 1rem' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '1rem', maxWidth: '40ch', margin: '0 0 2rem', color: '#4b5563' }}>
          An unexpected error occurred and the page could not be displayed. Our team has been
          notified.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            appearance: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.375rem',
            background: '#111827',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          Reload page
        </button>
      </body>
    </html>
  )
}
