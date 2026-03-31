/* path: /app/[locale]/page.tsx */
'use client'

import { Link } from '@/i18n/navigation'
import { GRADIENT_BG } from '@/lib/theme-colors'
import { Button, Div, H2, Icon, Modal, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import {
  HeroSection,
  FeaturesSection,
  BenefitsSection,
  ComparisonSection,
  CtaSection,
} from './landing-sections'

export default function HomePage() {
  const [currentYear] = useState(new Date().getFullYear())
  const t = useTranslations()
  const [showLunarPopup, setShowLunarPopup] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('lunar-popup-2026-seen')
    if (!seen) {
      const timer = setTimeout(() => setShowLunarPopup(true), 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  const closeLunarPopup = () => {
    setShowLunarPopup(false)
    sessionStorage.setItem('lunar-popup-2026-seen', 'true')
  }

  const features = [
    {
      icon: 'lucide:Upload',
      title: t('features.step1.title'),
      description: t('features.step1.description'),
    },
    {
      icon: 'lucide:Compass',
      title: t('features.step2.title'),
      description: t('features.step2.description'),
    },
    {
      icon: 'lucide:Sparkles',
      title: t('features.step3.title'),
      description: t('features.step3.description', { year: currentYear }),
    },
    {
      icon: 'lucide:Download',
      title: t('features.step4.title'),
      description: t('features.step4.description'),
    },
  ]

  const benefits = [
    { key: 'health', icon: 'lucide:Heart', color: '#D32F2F' },
    { key: 'wealth', icon: 'lucide:TrendingUp', color: '#2E7D32' },
    { key: 'career', icon: 'lucide:Briefcase', color: '#0D47A1' },
    { key: 'relationships', icon: 'lucide:Users', color: '#E91E63' },
    { key: 'fame', icon: 'lucide:Award', color: '#D4A017' },
    { key: 'serenity', icon: 'lucide:Leaf', color: '#00897B' },
  ]

  const comparisonRows = [
    { key: 'row1', free: true, premium: false },
    { key: 'row2', free: true, premium: false },
    { key: 'row3', free: false, premium: true },
    { key: 'row4', free: false, premium: true },
    { key: 'row5', free: false, premium: true, isNew: true },
  ]

  const fiveElements = [
    { name: t('elements.wood'), icon: 'lucide:TreePine', color: '#2E7D32' },
    { name: t('elements.fire'), icon: 'lucide:Flame', color: '#D32F2F' },
    { name: t('elements.earth'), icon: 'lucide:Mountain', color: '#BCA16A' },
    { name: t('elements.metal'), icon: 'lucide:Circle', color: '#B0BEC5' },
    { name: t('elements.water'), icon: 'lucide:Waves', color: '#0D47A1' },
  ]

  return (
    <>
      {/* Lunar New Year Popup */}
      <LunarPopup
        t={t}
        currentYear={currentYear}
        isOpen={showLunarPopup}
        onClose={closeLunarPopup}
      />

      <HeroSection t={t} currentYear={currentYear} />
      <FeaturesSection t={t} features={features} />
      <BenefitsSection t={t} benefits={benefits} fiveElements={fiveElements} />
      <ComparisonSection t={t} currentYear={currentYear} comparisonRows={comparisonRows} />
      <CtaSection t={t} />
    </>
  )
}

/** Lunar New Year popup modal */
function LunarPopup({
  t,
  currentYear,
  isOpen,
  onClose,
}: {
  t: (key: string, params?: Record<string, string | number>) => string
  currentYear: number
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <Div className="space-y-6">
        <Div className="text-center">
          <Div className="flex justify-center mb-4">
            <Image
              src="/star-2026.svg"
              alt="Flying Stars 2026"
              width={280}
              height={280}
              className="rounded-lg"
            />
          </Div>
          <H2 className="text-2xl font-bold" style={{ color: '#C41E3A' }}>
            {t('lunarPopup.title')}
          </H2>
          <P className="text-sm text-muted-foreground mt-1">
            {t('lunarPopup.subtitle', { year: currentYear })}
          </P>
        </Div>

        {/* Star 5 - DANGER */}
        <Div className="rounded-xl p-4 border-l-4 border-destructive bg-destructive/5">
          <Div className="flex items-center gap-2 mb-2">
            <Icon name="lucide:AlertTriangle" className="w-5 h-5 text-destructive" />
            <Span className="font-bold text-base text-destructive">
              {t('lunarPopup.dangerTitle')}
            </Span>
            <Span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
              {t('lunarPopup.dangerLocation')}
            </Span>
          </Div>
          <P className="text-sm text-muted-foreground leading-relaxed">
            {t('lunarPopup.dangerText', { year: currentYear })}
          </P>
        </Div>

        {/* Star 9 - PROSPERITY */}
        <Div className="rounded-xl p-4 border-l-4 border-warning bg-warning/5">
          <Div className="flex items-center gap-2 mb-2">
            <Icon name="lucide:Sparkles" className="w-5 h-5 text-warning" />
            <Span className="font-bold text-base text-warning">{t('lunarPopup.luckyTitle')}</Span>
            <Span className="text-xs px-2 py-0.5 rounded-full font-medium bg-warning/10 text-warning">
              {t('lunarPopup.luckyLocation')}
            </Span>
          </Div>
          <P className="text-sm text-muted-foreground leading-relaxed">
            {t('lunarPopup.luckyText', { year: currentYear })}
          </P>
        </Div>

        {/* CTA Buttons */}
        <Div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/analyze" onClick={onClose}>
            <Button
              size="lg"
              className={`${GRADIENT_BG} text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 w-full`}
            >
              <Icon name="lucide:Compass" className="mr-2 w-5 h-5" />
              {t('lunarPopup.cta')}
            </Button>
          </Link>
          <Button variant="ghost" size="lg" onClick={onClose} className="text-muted-foreground">
            {t('lunarPopup.dismiss')}
          </Button>
        </Div>
      </Div>
    </Modal>
  )
}
