/* path: /app/[locale]/page.tsx */
'use client'

import { Link } from '@/i18n/navigation'
import {
  GRADIENT_BG,
  GRADIENT_TEXT,
  THEME_COLORS,
  getGradientWithOpacity,
} from '@/lib/theme-colors'
import {
  Button,
  Card,
  CardContent,
  Div,
  H1,
  H2,
  Icon,
  KnownIconName,
  Modal,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function HomePage(): any {
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

  // Objectifs et bienfaits du Feng Shui
  const benefits = [
    {
      key: 'health',
      icon: 'lucide:Heart',
      color: '#D32F2F',
    },
    {
      key: 'wealth',
      icon: 'lucide:TrendingUp',
      color: '#2E7D32',
    },
    {
      key: 'career',
      icon: 'lucide:Briefcase',
      color: '#0D47A1',
    },
    {
      key: 'relationships',
      icon: 'lucide:Users',
      color: '#E91E63',
    },
    {
      key: 'fame',
      icon: 'lucide:Award',
      color: '#D4A017',
    },
    {
      key: 'serenity',
      icon: 'lucide:Leaf',
      color: '#00897B',
    },
  ]

  // Lignes du tableau comparatif
  const comparisonRows = [
    { key: 'row1', free: true, premium: false },
    { key: 'row2', free: true, premium: false },
    { key: 'row3', free: false, premium: true },
    { key: 'row4', free: false, premium: true },
    { key: 'row5', free: false, premium: true, isNew: true },
  ]

  // 5 éléments pour le visuel
  const fiveElements = [
    { name: t('elements.wood'), icon: 'lucide:TreePine', color: '#2E7D32' },
    { name: t('elements.fire'), icon: 'lucide:Flame', color: '#D32F2F' },
    { name: t('elements.earth'), icon: 'lucide:Mountain', color: '#BCA16A' },
    { name: t('elements.metal'), icon: 'lucide:Circle', color: '#B0BEC5' },
    { name: t('elements.water'), icon: 'lucide:Waves', color: '#0D47A1' },
  ]

  return (
    <>
      {/* Popup Nouvel An Lunaire */}
      <Modal
        isOpen={showLunarPopup}
        onClose={closeLunarPopup}
        size="xl"
        scrollBehavior="inside"
      >
        <div className="space-y-6">
          {/* Header avec image */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/star-2026.svg"
                alt="Étoiles Volantes 2026"
                width={280}
                height={280}
                className="rounded-lg"
              />
            </div>
            <h2
              className="text-2xl font-bold"
              style={{ color: '#C41E3A' }}
            >
              {t('lunarPopup.title')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('lunarPopup.subtitle', { year: currentYear })}
            </p>
          </div>

          {/* Étoile 5 - DANGER */}
          <div className="rounded-xl p-4 border-l-4" style={{ borderColor: '#C41E3A', backgroundColor: 'rgba(196, 30, 58, 0.05)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="lucide:AlertTriangle" className="w-5 h-5" style={{ color: '#C41E3A' }} />
              <span className="font-bold text-base" style={{ color: '#C41E3A' }}>
                {t('lunarPopup.dangerTitle')}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                {t('lunarPopup.dangerLocation')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('lunarPopup.dangerText', { year: currentYear })}
            </p>
          </div>

          {/* Étoile 9 - PROSPÉRITÉ */}
          <div className="rounded-xl p-4 border-l-4" style={{ borderColor: '#D4A017', backgroundColor: 'rgba(212, 160, 23, 0.05)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="lucide:Sparkles" className="w-5 h-5" style={{ color: '#D4A017' }} />
              <span className="font-bold text-base" style={{ color: '#D4A017' }}>
                {t('lunarPopup.luckyTitle')}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                {t('lunarPopup.luckyLocation')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('lunarPopup.luckyText', { year: currentYear })}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/analyze" onClick={closeLunarPopup}>
              <Button
                size="lg"
                className={`${GRADIENT_BG} text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 w-full`}
              >
                <Icon name="lucide:Compass" className="mr-2 w-5 h-5" />
                {t('lunarPopup.cta')}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="lg"
              onClick={closeLunarPopup}
              className="text-muted-foreground"
            >
              {t('lunarPopup.dismiss')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Hero Section */}
      <Section size={'full'} className="pt-16 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 animate-pulse"
            style={getGradientWithOpacity(15, 'br')}
          />
          <div
            className="absolute inset-0 animate-pulse"
            style={{ ...getGradientWithOpacity(15, 'tr'), animationDelay: '1s' }}
          />
        </div>
        <Div layout={'center'}>
          <P className="text-sm font-bold tracking-widest uppercase" style={{ color: '#D4A017' }}>
            {t('banner.tagline')}
          </P>

          <Image src="/logo.png" alt="Feng Shui" width={160} height={160} className="object-contain mb-4" />

          <H1 className="text-5xl md:text-7xl font-bold mb-4">
            <span className={`bg-gradient-to-r ${GRADIENT_TEXT}`}>
              {t('hero.title', { year: currentYear })}
            </span>
          </H1>

          <P className="text-lg font-medium" style={{ color: '#C41E3A' }}>
            {t('banner.title', { year: currentYear })}
          </P>

          <P className="text-base text-foreground/70">
            {t('banner.subtitle', { year: currentYear })}
          </P>

          {/* USP - Unique Selling Proposition */}
          <div
            className="max-w-xl mx-auto my-6 px-6 py-4 rounded-2xl border-2 text-center"
            style={{
              borderColor: 'rgba(212, 160, 23, 0.4)',
              backgroundColor: 'rgba(212, 160, 23, 0.06)',
            }}
          >
            <P className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">
              {t('hero.usp')}
            </P>
          </div>

          <P size={'sm'} className="max-w-2xl mx-auto">
            {t('hero.description', { year: currentYear })}
          </P>

          <Div layout={'grid'} size={'lg'}>
            <Link href="/analyze">
              <Button
                size="lg"
                className={`${GRADIENT_BG} text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}
              >
                <Icon name="lucide:Compass" className="mr-2 w-5 h-5" />
                {t('hero.cta')}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="border-2"
              onClick={() =>
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <Icon name="lucide:Info" className="mr-2 w-5 h-5" />
              {t('hero.learnMore')}
            </Button>
          </Div>
        </Div>
      </Section>

      {/* Process Flow Section - 4 étapes avec flèches */}
      <div id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <H2 className="text-4xl font-bold mb-4 text-foreground">{t('features.title')}</H2>
          <P className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </P>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-2 max-w-5xl mx-auto">
          {features.map((feature, idx) => (
            <div key={idx} className="flex flex-col lg:flex-row items-center">
              {/* Step card */}
              <div className="flex flex-col items-center text-center w-52">
                {/* Step number + icon */}
                <div className="relative mb-4">
                  <div
                    className={`bg-gradient-to-br ${THEME_COLORS.gradientClasses} w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg`}
                  >
                    <Icon name={feature.icon as KnownIconName} className="h-9 w-9" />
                  </div>
                  <div
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                    style={{ background: '#C41E3A' }}
                  >
                    {idx + 1}
                  </div>
                </div>
                <h3 className="text-base font-bold mb-1 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-snug">{feature.description}</p>
              </div>

              {/* Arrow between steps */}
              {idx < features.length - 1 && (
                <>
                  <Icon
                    name="lucide:ArrowRight"
                    className="hidden lg:block w-8 h-8 text-muted-foreground/40 mx-2 flex-shrink-0"
                  />
                  <Icon
                    name="lucide:ArrowDown"
                    className="lg:hidden w-8 h-8 text-muted-foreground/40 my-2 flex-shrink-0"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Objectifs & Bienfaits */}
      <Section
        size={'full'}
        className="bg-muted/30"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <H2 className="text-4xl font-bold mb-4 text-foreground">{t('benefits.title')}</H2>
            <P className="text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('benefits.subtitle')}
            </P>
          </div>

          {/* 6 objectifs/bienfaits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {benefits.map((benefit) => (
              <Card
                key={benefit.key}
                className="group hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden border-t-4"
                style={{ borderTopColor: benefit.color }}
              >
                <CardContent className="p-6 text-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md"
                    style={{ backgroundColor: `${benefit.color}15` }}
                  >
                    <Icon
                      name={benefit.icon as KnownIconName}
                      className="w-7 h-7"
                      style={{ color: benefit.color }}
                    />
                  </div>
                  <h3 className="font-bold text-base text-foreground mb-2">
                    {t(`benefits.${benefit.key}.title`)}
                  </h3>
                  <P className="text-sm text-muted-foreground leading-relaxed">
                    {t(`benefits.${benefit.key}.description`)}
                  </P>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Origines Feng Shui + 5 éléments */}
          <div className="text-center mb-8">
            <P className="text-sm text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('sectors.origins')}
            </P>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {fiveElements.map((el, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-md border-2 border-white"
                  style={{ backgroundColor: el.color }}
                >
                  <Icon name={el.icon as KnownIconName} className="w-7 h-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-foreground">{el.name}</span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/analyze" className="mt-4 inline-block">
          <Button
            size="lg"
            className={`${GRADIENT_BG} text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}
          >
            <Icon name="lucide:Sparkles" />
            <Span className="hidden md:inline">{t('cta.subtitle')}</Span>
            <Span className="md:hidden">{t('cta.shortLabel')}</Span>
          </Button>
        </Link>
      </Section>

      {/* Tableau comparatif */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <H2 className="text-4xl font-bold mb-4 text-foreground">{t('comparison.title')}</H2>
          <P className="text-base text-muted-foreground max-w-2xl mx-auto">
            {t('comparison.subtitle')}
          </P>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground border-b border-border" />
                <th className="p-4 text-center border-b border-border">
                  <div className="flex flex-col items-center gap-1">
                    <Icon name="lucide:Sparkles" className="w-6 h-6" style={{ color: '#D4A017' }} />
                    <span className="text-sm font-bold text-foreground">{t('comparison.ourTool')}</span>
                  </div>
                </th>
                <th className="p-4 text-center border-b border-border">
                  <div className="flex flex-col items-center gap-1">
                    <Icon name="lucide:User" className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm font-bold text-muted-foreground">{t('comparison.consultant')}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground font-medium">
                    <div className="flex items-center gap-2">
                      {t(`comparison.${row.key}.label`, { year: currentYear })}
                      {row.isNew && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: '#D4A017' }}>
                          {t('comparison.new')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {row.free ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
                        <Icon name="lucide:Check" className="w-5 h-5" />
                        {t('comparison.free')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: '#D4A017' }}>
                        <Icon name="lucide:Star" className="w-4 h-4" />
                        {t('comparison.premium')}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center text-sm text-muted-foreground font-medium">
                    {t(`comparison.${row.key}.consultant`)}
                  </td>
                </tr>
              ))}
              {/* Ligne total */}
              <tr className="bg-muted/50 font-bold">
                <td className="p-4 text-sm text-foreground">{t('comparison.total.label')}</td>
                <td className="p-4 text-center">
                  <span className="text-sm font-bold text-green-600">{t('comparison.total.ours')}</span>
                </td>
                <td className="p-4 text-center text-sm text-red-500 font-bold">{t('comparison.total.consultant')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA Section - Avantages marketing */}
      <div className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-br from-card via-card to-muted/20 shadow-2xl overflow-hidden">
          <CardContent className="p-12 text-center relative">
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl"
              style={getGradientWithOpacity(10, 'br')}
            />
            <div
              className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl"
              style={getGradientWithOpacity(10, 'tr')}
            />

            <div className="relative">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border"
                style={{
                  backgroundColor: 'rgba(212, 160, 23, 0.1)',
                  borderColor: 'rgba(212, 160, 23, 0.3)',
                }}
              >
                <Icon name="lucide:Shield" className="w-4 h-4" style={{ color: '#D4A017' }} />
                <span className="text-sm font-semibold text-foreground">
                  {t('cta.badge')}
                </span>
              </div>

              <H2 size={'giant'} className="flex flex-col items-center mb-4">
                <span className={GRADIENT_TEXT}>{t('cta.title')}</span>
              </H2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
                <div className="flex flex-col items-center">
                  <Icon name="lucide:PiggyBank" className="w-8 h-8 mb-2" style={{ color: '#D4A017' }} />
                  <span className="text-sm font-semibold text-foreground">
                    {t('cta.advantage1')}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Icon name="lucide:Bot" className="w-8 h-8 mb-2" style={{ color: '#C41E3A' }} />
                  <span className="text-sm font-semibold text-foreground">
                    {t('cta.advantage2')}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Icon name="lucide:Zap" className="w-8 h-8 mb-2" style={{ color: '#2E7D32' }} />
                  <span className="text-sm font-semibold text-foreground">
                    {t('cta.advantage3')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/analyze">
                  <Button
                    size="lg"
                    className={`${GRADIENT_BG} text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}
                  >
                    <Icon name="lucide:Sparkles" />
                    <Span className="hidden md:inline">{t('cta.subtitle')}</Span>
                    <Span className="md:hidden">{t('cta.shortLabel')}</Span>
                  </Button>
                </Link>
                <Link href="/donate">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 hover:bg-accent/50 transition-all transform hover:scale-105"
                  >
                    <Icon name="lucide:Leaf" className="text-green-600" />
                    <Span>{t('cta.supportTool')}</Span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
