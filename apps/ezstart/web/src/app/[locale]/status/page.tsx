import { getApiUrl } from '@ezstart/config'
import { StatusPage } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'

const EZSTART_API_URL = getApiUrl('ezstart')
const EZAUTH_API_URL = getApiUrl('ezauth')
const EZPAY_API_URL = getApiUrl('ezpay')

export default function StatusRoute() {
  const t = useTranslations('status')
  const locale = useLocale()

  return (
    <StatusPage
      locale={locale}
      services={[
        {
          name: t('services.ezstartApi'),
          url: `${EZSTART_API_URL}/health`,
          description: t('services.ezstartApiDescription'),
          mode: 'deep',
          deepUrl: `${EZSTART_API_URL}/health/deep`,
        },
        {
          name: t('services.ezauthApi'),
          url: `${EZAUTH_API_URL}/health`,
          description: t('services.ezauthApiDescription'),
          mode: 'deep',
          deepUrl: `${EZAUTH_API_URL}/health/deep`,
        },
        {
          name: t('services.ezpayApi'),
          url: `${EZPAY_API_URL}/health`,
          description: t('services.ezpayApiDescription'),
          mode: 'deep',
          deepUrl: `${EZPAY_API_URL}/health/deep`,
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
