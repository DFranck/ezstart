import { getApiUrl } from '@ezstart/config'
import { StatusPage } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'

const EZBILL_API_URL = getApiUrl('ezbill')
const EZAUTH_API_URL = getApiUrl('ezauth')

export default function StatusRoute() {
  const t = useTranslations('status')
  const locale = useLocale()

  return (
    <StatusPage
      locale={locale}
      services={[
        // Own API → deep mode (the operator owns the snapshot).
        {
          name: t('services.ezbillApi'),
          url: `${EZBILL_API_URL}/health`,
          description: t('services.ezbillApiDescription'),
          mode: 'deep',
          deepUrl: `${EZBILL_API_URL}/health/deep`,
        },
        // 🔒 Upstream Tier-1 service → shallow mode (hacker-A8 V4).
        // Deep snapshots from ezauth belong to its own status page —
        // consumer apps only show up/down. See
        // `.claude/rules/standard-architecture.md` §3.
        {
          name: t('services.ezauthApi'),
          url: `${EZAUTH_API_URL}/health`,
          description: t('services.ezauthApiDescription'),
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
        refreshHint: t('refreshHint'),
        refreshButton: t('refreshButton'),
        dependenciesLabel: t('dependenciesLabel'),
        checkStatusOk: t('checkStatus.ok'),
        checkStatusDegraded: t('checkStatus.degraded'),
        checkStatusDown: t('checkStatus.down'),
      }}
    />
  )
}
