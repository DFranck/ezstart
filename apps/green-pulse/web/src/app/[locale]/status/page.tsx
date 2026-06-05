import { StatusPage } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'

const GREEN_PULSE_API_URL = process.env.NEXT_PUBLIC_GREEN_PULSE_API_URL ?? 'http://localhost:6160'
const EZAUTH_API_URL = process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'
const EZPAY_API_URL = process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130'

export default function StatusRoute() {
  const t = useTranslations('status')
  const locale = useLocale()

  return (
    <StatusPage
      locale={locale}
      services={[
        {
          name: t('services.greenPulseApi'),
          url: `${GREEN_PULSE_API_URL}/health`,
          description: t('services.greenPulseApiDescription'),
          mode: 'deep',
          deepUrl: `${GREEN_PULSE_API_URL}/health/deep`,
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
