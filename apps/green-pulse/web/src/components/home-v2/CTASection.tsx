'use client'

import { getApiUrl } from '@ezstart/config/urls'
import { Button, H2, Input, P, Section } from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

/**
 * Final CTA section
 * Last chance to convert visitors to waitlist
 */
export function CTASection() {
  const [email, setEmail] = useState('')
  const t = useTranslations('homeV2.cta')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await runWithFeedback({
      action: async () => {
        const apiUrl = getApiUrl('ezauth')
        const response = await fetch(`${apiUrl}/api/auth/waitlist/green-pulse/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409 && data.code === 'EMAIL_EXISTS') {
            throw new Error(t('alreadyRegistered'))
          } else {
            throw new Error(data.error || t('error'))
          }
        }

        setEmail('')
        return data
      },
      toastLoading: { message: t('loading') },
      toastSuccess: { message: t('thankYou') },
      toastError: false,
      onError: error => {
        const errorMessage =
          error instanceof Error ? error.message : t('error')
        toast.error(errorMessage)
      },
    })
  }

  return (
    <Section size={'full'} className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-blue-600">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Title */}
        <H2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
          {t('title')}
        </H2>

        {/* Description */}
        <P className="text-lg sm:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          {t('description')}
        </P>

        {/* CTA Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto border border-white/20 shadow-2xl">
          <form
            onSubmit={handleEmailSubmit}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          >
            <Input
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1 h-12 sm:h-14 text-base bg-white/90 border-white/30"
            />
            <Button
              type="submit"
              size="lg"
              className="bg-white text-green-600 hover:bg-white/90 font-bold px-6 sm:px-10 py-3 sm:py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              {t('joinWaitlist')}
            </Button>
          </form>
          <P className="text-sm text-white/80 mt-4">
            {t('noCreditCard')}
          </P>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            <span>{t('badge1')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span>{t('badge2')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💚</span>
            <span>{t('badge3')}</span>
          </div>
        </div>
      </div>
    </Section>
  )
}
