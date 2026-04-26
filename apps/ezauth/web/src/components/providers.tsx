'use client'

import { AuthProvider, useAuthStore } from '@ezstart/auth-sdk'
import { MaintenanceBanner } from '@ezstart/auth-sdk/components'
import { PayProvider } from '@ezstart/pay-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import { QueryProvider } from './providers/QueryProvider'

function handleAuthFailure() {
  useAuthStore.getState().logout()
}

/**
 * Inner shell that mounts the platform-wide `<MaintenanceBanner>` on top of
 * the page content. Lives below `<QueryProvider>` because the banner uses
 * React Query (polling `/api/maintenance-status`).
 */
function PlatformShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin.maintenanceMode.banner')
  return (
    <>
      <MaintenanceBanner
        sticky
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
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

export function Providers({ children }: { children: React.ReactNode }) {
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
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
        webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
      >
        <QueryProvider>
          {/*
            PayProvider is scoped via `applicationId` (not `publishableKey`):
            NEXT_PUBLIC_EZAUTH_KEY is an EZAUTH publishable key; passing it
            here would make PayProvider call ezpay `/api/keys/config` with an
            ezauth key and 404. Using `applicationId` bypasses the key-config
            resolve and scopes ezpay queries directly to the ezauth tenant.
          */}
          <PayProvider
            applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID ?? ''}
            appName="ezauth"
            config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }}
            locale={locale}
            getToken={() => useAuthStore.getState().accessToken}
            onAuthFailure={handleAuthFailure}
          >
            <PlatformShell>{children}</PlatformShell>
          </PayProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
