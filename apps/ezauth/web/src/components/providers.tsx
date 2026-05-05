'use client'

import {
  AuthProvider,
  useAuthStoreGetSnapshot,
  useAuthStoreApi,
  type AuthUser,
} from '@ezstart/auth-sdk'
import { useMaintenanceStatus } from '@ezstart/api-sdk/react'
import { PayProvider } from '@ezstart/pay-sdk'
import { MaintenanceBanner } from '@ezstart/ui/components'
import { ThemeProvider } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { QueryProvider } from './providers/QueryProvider'

/**
 * Inner shell that mounts the platform-wide `<MaintenanceBanner>` on top of
 * the page content. Lives below `<QueryProvider>` because the banner data
 * comes from React Query (polling `/api/maintenance-status` via
 * `useMaintenanceStatus` from `@ezstart/api-sdk/react`).
 *
 * Composes the data hook + presentation primitive directly — the previous
 * single-shot `<MaintenanceBanner>` from `@ezstart/auth-sdk/components` was
 * deprecated on 2026-05-01 (split architecture, removal 2026-08-01).
 */
function PlatformShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin.maintenanceMode.banner')
  const { data } = useMaintenanceStatus({
    apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110',
  })
  return (
    <>
      <MaintenanceBanner
        status={data ?? null}
        sticky
        texts={{
          heading: t('heading'),
          scheduledEndLabel: t('scheduledEndLabel'),
          dismissAriaLabel: t('dismissAriaLabel'),
        }}
      />
      {children}
    </>
  )
}

/**
 * Bridge component: lives INSIDE `<AuthProvider>` so it can read the auth
 * store via Context. Wires the `getToken` + `onAuthFailure` callbacks for
 * `<PayProvider>` (which sits in the same React tree but consumes the
 * auth store imperatively). Splitting this out keeps the bridge logic
 * close to the SDK plumbing it depends on.
 */
function PayBridge({ children, locale }: { children: React.ReactNode; locale: string }) {
  const getSnapshot = useAuthStoreGetSnapshot()
  const storeApi = useAuthStoreApi()
  const onAuthFailure = useCallback(() => {
    storeApi.getState().logout()
  }, [storeApi])
  return (
    <PayProvider
      // Phase 3 ENV-DIET (2026-05-05) — `applicationId` is auto-resolved by
      // pay-sdk from `NEXT_PUBLIC_EZPAY_KEY` via ezpay's
      // `/keys/config.applicationId`. Make sure the EZPay publishable key is
      // seeded against the ezauth-tenant Application in EZPay's DB so the
      // resolved `applicationId` correctly scopes payments to ezauth.
      // Phase A1 ENV-DIET (2026-05-05) — `apiUrl` is OPTIONAL: SDK ships
      // `https://ezpay-api.ezstart.xyz` as a hardcoded default for prod.
      appName="ezauth"
      publishableKey={process.env.NEXT_PUBLIC_EZPAY_KEY}
      config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL }}
      locale={locale}
      getToken={() => getSnapshot().accessToken}
      onAuthFailure={onAuthFailure}
    >
      <PlatformShell>{children}</PlatformShell>
    </PayProvider>
  )
}

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode
  /**
   * SSR-resolved user — passed down from the locale-root layout, which calls
   * `getServerAuth()` from `@ezstart/auth-sdk/server` against the request
   * cookie. Hydrates the auth store synchronously on first render so the
   * AppShell renders the right chrome (UserMenu vs LoginButton) on the very
   * first paint — no flash on initial load or cross-group navigations.
   */
  initialUser?: AuthUser | null
}) {
  const locale = useLocale()
  return (
    <ThemeProvider>
      {/*
        Dogfood pattern (cf. .claude/rules/standard-saas-keys.md §3): ezauth
        web consumes its OWN auth API as if it were a third-party consumer —
        same code path as a third-party external app. We pass the publishable key
        (`NEXT_PUBLIC_EZAUTH_KEY`, scope=`admin`, app=`ezauth`) so the SDK
        resolves the key config exactly like a foreign tenant would.

        `mode="first-party"` is intentionally KEPT: it tells the SDK to skip
        the cross-origin OAuth dance because we are already on the auth host
        (cookies are first-party here — same registrable domain as the API).
        Without it, login on ezauth.ezstart.xyz would redirect to itself.
        The publishable key is still resolved and forwarded for theming and
        observability; the dogfood claim is "same key plumbing as a consumer",
        not "same OAuth redirect dance".
      */}
      <AuthProvider
        appName="ezauth"
        authMode="httpOnly"
        mode="first-party"
        publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
        // Phase D ENV-DIET (2026-05-05) — `apiUrl` and `webUrl` are now
        // OPTIONAL in every canonical environment. The SDK ships an
        // env-aware default URL table (`EZAUTH_URLS_BY_ENV` in
        // `@ezstart/auth-sdk/core/defaults`) keyed on `DEPLOY_ENV` (or
        // `VERCEL_GIT_COMMIT_REF` / `NODE_ENV` / hostname when DEPLOY_ENV
        // is absent). Self-hosted callers override via the props or the
        // `NEXT_PUBLIC_EZAUTH_*_URL` env vars — those win over the
        // env-aware defaults.
        initialUser={initialUser}
      >
        <QueryProvider>
          {/*
            PayProvider is scoped via `NEXT_PUBLIC_EZPAY_KEY` (the EZPay
            publishable key) — pay-sdk auto-resolves `applicationId` from
            ezpay's `/keys/config.applicationId`. NOTE: `NEXT_PUBLIC_EZAUTH_KEY`
            is an EZAUTH key and would 404 against ezpay's endpoint, so the
            two publishable keys MUST stay distinct.
          */}
          <PayBridge locale={locale}>{children}</PayBridge>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
