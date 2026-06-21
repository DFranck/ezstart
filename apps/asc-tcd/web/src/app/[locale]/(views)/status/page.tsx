import { getApiUrl } from '@ezstart/config'
import { StatusPage } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'

const EZAUTH_API_URL = getApiUrl('ezauth')
const EZPAY_API_URL = getApiUrl('ezpay')

export default function StatusRoute() {
  const t = useTranslations('status')
  const locale = useLocale()

  return (
    <StatusPage
      locale={locale}
      services={[
        // 🔒 Consumer apps use `mode: 'shallow'` against upstream Tier-1
        // services (hacker-A8 V4). Deep snapshots expose first-party
        // dependency internals (Mongo / Stripe / Resend errors) that
        // unauthenticated visitors of a different product surface have
        // no business reading. See
        // `.claude/rules/standard-architecture.md` §3.
        {
          name: t('services.ezauthApi'),
          url: `${EZAUTH_API_URL}/health`,
          description: t('services.ezauthApiDescription'),
          mode: 'shallow',
        },
        {
          name: t('services.ezpayApi'),
          url: `${EZPAY_API_URL}/health`,
          description: t('services.ezpayApiDescription'),
          mode: 'shallow',
        },
      ]}
      texts={{
        title: t('title'),
        intro: t('intro'),
        componentsHeading: t('componentsHeading'),
        incidentsHeading: t('incidentsHeading'),
        incidentsBody: t('incidentsBody'),
        summaryOperational: t('summary.operational'),
        summaryDegraded: t('summary.degraded'),
        summaryDown: t('summary.down'),
        summaryChecking: t('summary.checking'),
        stateOperational: t('state.operational'),
        stateDegraded: t('state.degraded'),
        stateDown: t('state.down'),
        stateChecking: t('state.checking'),
        lastCheckedLabel: t('lastCheckedLabel'),
        responseTimeLabel: t('responseTimeLabel'),
        refreshHint: t('refreshHint', { seconds: 30 }),
        refreshButton: t('refreshButton'),
        dependenciesLabel: t('dependenciesLabel'),
        checkStatusOk: t('checkStatus.ok'),
        checkStatusDegraded: t('checkStatus.degraded'),
        checkStatusDown: t('checkStatus.down'),
      }}
    />
  )
}
