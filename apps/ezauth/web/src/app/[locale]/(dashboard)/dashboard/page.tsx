import { headers } from 'next/headers'
import {
  getServerApiKeys,
  getServerApplications,
  getServerAuditLog,
} from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { DashboardClient } from './DashboardClient'

/**
 * Unified `/dashboard` — Server Component shell.
 *
 * Pre-fetches the user's API keys, audit log entries and applications via the
 * Wave 1 SSR helpers (`getServerApiKeys`, `getServerAuditLog`,
 * `getServerApplications`) using the inbound session cookie. The fetched data
 * is forwarded to `<DashboardClient>` (the original `'use client'` content)
 * which in turn passes it to `<EZAuthDashboard>` as `initialKeys` /
 * `initialAuditEntries` / `initialApplications`. React Query's cache is
 * seeded synchronously in the SDK, so the very first paint already shows the
 * data — no `<Spinner>` flash on dashboard / api-keys / activity / apps.
 *
 * When the user is anonymous (no cookie), each helper returns `null` and the
 * client component falls back to the legacy client-side fetch + redirect to
 * `/login`. No regression for anonymous traffic.
 */
export default async function DashboardPage() {
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie')
  const apiUrl = process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'

  // Three independent fetches — run them in parallel to keep the server-side
  // wait under one round-trip (the slowest of the three).
  const [initialKeys, initialAuditEntries, initialApplications] = await Promise.all([
    getServerApiKeys({ apiUrl, cookieHeader, logger }),
    getServerAuditLog({ apiUrl, cookieHeader, logger, filters: { limit: 20 } }),
    getServerApplications({ apiUrl, cookieHeader, logger }),
  ])

  return (
    <DashboardClient
      initialKeys={initialKeys ?? undefined}
      initialAuditEntries={initialAuditEntries ?? undefined}
      initialApplications={initialApplications ?? undefined}
    />
  )
}
