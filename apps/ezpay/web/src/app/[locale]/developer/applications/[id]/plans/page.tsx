'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { PlansManager, type PlansManagerTexts } from '@ezstart/pay-sdk/components'
import { BackButton, Div, Spinner } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Plans management page for a single application.
 *
 * Wraps the pay-sdk {@link PlansManager} component — the component handles
 * list / create / edit / archive via the EZPay API. Owner auth is enforced
 * server-side (ownerId + superadmin) so we only guard the route with the
 * standard "must be authenticated" pattern here.
 */
export default function ApplicationPlansPage() {
  const t = useTranslations('developer.plansManager')
  const te = useTranslations('developer.plansManager.editor')
  const locale = useLocale()
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isAuthReady, login } = useAuth()

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      // Redirect to EZAuth login (ezpay has no local /login route — auth lives on ezauth)
      login()
    }
  }, [isAuthReady, isAuthenticated, login])

  const applicationId = typeof params?.id === 'string' ? params.id : ''

  if (!isAuthReady || !isAuthenticated) {
    return (
      <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  const texts: Partial<PlansManagerTexts> = {
    title: t('title'),
    subtitle: t('subtitle'),
    createButton: t('createButton'),
    empty: t('empty'),
    columns: {
      name: t('columns.name'),
      price: t('columns.price'),
      interval: t('columns.interval'),
      status: t('columns.status'),
      features: t('columns.features'),
      actions: t('columns.actions'),
    },
    status: {
      active: t('status.active'),
      inactive: t('status.inactive'),
    },
    actions: {
      edit: t('actions.edit'),
      archive: t('actions.archive'),
      archiveConfirm: t('actions.archiveConfirm'),
      archiveCancel: t('actions.archiveCancel'),
      archiveConfirmDescription: t('actions.archiveConfirmDescription'),
    },
    toast: {
      created: t('toast.created'),
      updated: t('toast.updated'),
      archived: t('toast.archived'),
      error: t('toast.error'),
    },
    editor: {
      createTitle: te('createTitle'),
      editTitle: te('editTitle'),
      dialogDescription: te('dialogDescription'),
      nameLabel: te('nameLabel'),
      namePlaceholder: te('namePlaceholder'),
      descriptionLabel: te('descriptionLabel'),
      descriptionPlaceholder: te('descriptionPlaceholder'),
      amountLabel: te('amountLabel'),
      amountPlaceholder: te('amountPlaceholder'),
      currencyLabel: te('currencyLabel'),
      intervalLabel: te('intervalLabel'),
      intervalMonth: te('intervalMonth'),
      intervalYear: te('intervalYear'),
      intervalCountLabel: te('intervalCountLabel'),
      intervalCountHelp: te('intervalCountHelp'),
      featuresLabel: te('featuresLabel'),
      featuresHelp: te('featuresHelp'),
      grantsRolesLabel: te('grantsRolesLabel'),
      grantsRolesHelp: te('grantsRolesHelp'),
      grantsFeaturesLabel: te('grantsFeaturesLabel'),
      grantsFeaturesHelp: te('grantsFeaturesHelp'),
      // P9-A/B fields — SDK default English labels are used until the messages
      // catalogue adds translations under `developer.plansManager.editor.*`.
      trialDaysLabel: 'Trial period (days)',
      trialDaysHelp: 'Free-trial duration between 0 and 90 days. Leave at 0 to disable.',
      billingGroupLabel: 'Billing group',
      billingGroupHelp: 'Logical identifier that links Monthly / Yearly variants (e.g. "pro").',
      discountVsMonthlyLabel: 'Yearly savings vs. monthly (%)',
      discountVsMonthlyHelp:
        'Displayed as "Save N%" on the pricing page toggle. Yearly plans only.',
      sortOrderLabel: te('sortOrderLabel'),
      activeLabel: te('activeLabel'),
      cancel: te('cancel'),
      save: te('save'),
      saving: te('saving'),
      validation: {
        nameRequired: te('validation.nameRequired'),
        amountInvalid: te('validation.amountInvalid'),
        intervalCountRange: te('validation.intervalCountRange'),
        trialDaysRange: 'Trial days must be between 0 and 90',
        discountVsMonthlyRange: 'Yearly savings must be between 0 and 100',
      },
      toast: {
        created: t('toast.created'),
        updated: t('toast.updated'),
        error: t('toast.error'),
      },
    },
  }

  return (
    <Div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <BackButton
        onClick={() => router.push(`/${locale}/developer/applications/${applicationId}`)}
      />
      <PlansManager applicationId={applicationId} locale={locale} texts={texts} />
    </Div>
  )
}
