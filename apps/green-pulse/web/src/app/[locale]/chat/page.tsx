'use client'

import { AILayout } from '@ezstart/ai-sdk/client'
import { UserMenu, useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/auth-sdk'
import { PayProvider, usePlans } from '@ezstart/pay-sdk'
import { Button, Div, Icon, Main, Nav, Span } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'

const FUTURE_TOOLS = [
  { href: '/dashboard', labelKey: 'dashboards', icon: 'lucide:LayoutDashboard' as const },
  { href: '/upload', labelKey: 'uploadFiles', icon: 'lucide:Upload' as const },
  { href: '/documents', labelKey: 'documents', icon: 'lucide:FileText' as const },
  { href: '/compliances', labelKey: 'compliances', icon: 'lucide:Shield' as const },
]

/**
 * GreenPulse `green-pulse` Application id resolved at build time. Used to
 * scope the pay-sdk plans query to the green-pulse tenant. Optional — when
 * unset the sidebar renders the i18n fallback label instead of fetching.
 */
const GREEN_PULSE_APPLICATION_ID = process.env.NEXT_PUBLIC_EZAUTH_APP_ID

/**
 * Renders the user's current plan label dynamically from the pay-sdk plans
 * list. Defaults to the lowest-priced active plan (the Free tier).
 *
 * Graceful states:
 *  - loading → localized "loading" placeholder
 *  - error / empty → localized "no plan" placeholder
 *  - success → `plan.name` from EZPay (single source of truth)
 */
function CurrentPlanLabel() {
  const t = useTranslations('chat')
  const { plans, isLoading, error } = usePlans({ active: true })

  if (isLoading) {
    return <Span className="text-sm font-semibold">{t('plans.loading')}</Span>
  }

  if (error || plans.length === 0) {
    return <Span className="text-sm font-semibold">{t('plans.noPlan')}</Span>
  }

  // Default plan = lowest sortOrder (the Free tier seeded by ezpay).
  const defaultPlan = plans[0]
  if (!defaultPlan) {
    return <Span className="text-sm font-semibold">{t('plans.noPlan')}</Span>
  }
  return <Span className="text-sm font-semibold">{defaultPlan.name}</Span>
}

export default function LiaPage() {
  const t = useTranslations('chat')
  const tAuth = useTranslations('auth')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const theme = useTheme()
  const { user } = useAuthStore()
  const rbac = useRBAC(user, 'green-pulse')
  const isAdmin = rbac.hasAnyRole(['admin', 'superadmin'])

  const handleLocaleChange = useCallback(
    (newLocale: string) => {
      router.push(pathname.replace(`/${locale}`, `/${newLocale}`))
    },
    [pathname, locale, router]
  )

  const sidebarHeader = (
    <Div className="h-14 flex items-center justify-center px-3">
      <Button asChild variant="ghost" className="w-full">
        <Link href="/">
          <Image
            src="/logo_complet_light.svg"
            alt="GreenPulse.AI"
            width={150}
            height={32}
            className="animate-glow-pulse-sm dark:hidden"
          />
          <Image
            src="/logo_complet_dark.svg"
            alt="GreenPulse.AI"
            width={150}
            height={32}
            className="animate-glow-pulse-sm hidden dark:block"
          />
          <Span className="sr-only">GreenPulse.AI</Span>
        </Link>
      </Button>
    </Div>
  )

  const toolsItems = useMemo(
    () =>
      FUTURE_TOOLS.map(item => ({
        ...item,
        label: t(`sidebar.tools.${item.labelKey}`),
      })),
    [t]
  )

  const sidebarFooter = (
    <Div className="space-y-3">
      {/* My plan section */}
      <Div className="space-y-1">
        <Div className="flex items-center gap-2 px-2 py-1">
          <Icon name="lucide:Briefcase" size={16} className="text-muted-foreground" />
          <Span className="text-xs font-medium text-muted-foreground">{t('sidebar.myPlan')}</Span>
        </Div>
        <Div className="px-2">
          {GREEN_PULSE_APPLICATION_ID ? (
            <PayProvider
              applicationId={GREEN_PULSE_APPLICATION_ID}
              getToken={() => useAuthStore.getState().accessToken}
            >
              <CurrentPlanLabel />
            </PayProvider>
          ) : (
            <Span className="text-sm font-semibold">{t('plans.noPlan')}</Span>
          )}
        </Div>
      </Div>

      <Div className="border-t mx-2" />

      {/* Upgrade prompt + Admin link (if admin) + future tools (disabled) */}
      <Div className="space-y-1">
        <Div className="px-2 py-1">
          <Span className="text-xs font-medium text-muted-foreground">
            {t('sidebar.upgradePrompt')}
          </Span>
        </Div>
        <Nav className="space-y-0.5">
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="w-full justify-start h-8 px-2">
              <Link href="/admin">
                <Icon name="lucide:Shield" className="mr-2" size={14} />
                <Span className="text-xs">Admin</Span>
              </Link>
            </Button>
          )}
          {toolsItems.map(item => (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              disabled
              className="w-full justify-start opacity-50 cursor-not-allowed h-8 px-2"
            >
              <Icon name={item.icon} className="mr-2" size={14} />
              <Span className="text-xs">{item.label}</Span>
            </Button>
          ))}
        </Nav>
      </Div>

      {/* User menu */}
      <Div className="border-t pt-3">
        <UserMenu
          side="top"
          variant="extended"
          theme={theme}
          className="w-full"
          languages={[
            { code: 'en', label: 'English' },
            { code: 'fr', label: 'Français' },
            { code: 'vi', label: 'Tiếng Việt' },
          ]}
          currentLocale={locale}
          onLocaleChange={handleLocaleChange}
          texts={{
            signOut: tAuth('logout'),
            manageAccount: t('sidebar.settings'),
          }}
        />
      </Div>
    </Div>
  )

  return (
    <Main className="h-dvh">
      <AILayout
        appName="green-pulse"
        locale={locale}
        height="viewport"
        getToken={() => useAuthStore.getState().accessToken}
        extraPayload={{ extract_esg: false }}
        texts={{
          welcomeTitle: t('welcomeTitle'),
          welcomeDescription: t('welcomeDescription'),
          composerPlaceholder: t('composerPlaceholder'),
          loadingText: t('loadingText'),
          newChatLabel: t('sidebar.newChat'),
          sidebarEmptyState: t('sidebar.emptyState'),
          loginPrompt: t('sidebar.loginPrompt'),
          loginPromptTitle: t('loginPromptTitle'),
          loginPromptDescription: t('loginPromptDescription'),
          loginPromptCTA: t('loginPromptCTA'),
          loginPromptComposerPlaceholder: t('loginPromptComposerPlaceholder'),
        }}
        slots={{
          sidebarHeader,
          sidebarFooter,
        }}
      />
    </Main>
  )
}
