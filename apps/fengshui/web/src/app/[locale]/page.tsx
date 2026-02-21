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

  // Vraies données des 9 secteurs avec leurs couleurs réelles
  const sectors = [
    {
      direction: t('directions.N'),
      name: t('sectors.career.name'),
      element: t('elements.water'),
      colors: ['#0D47A1', '#1565C0', '#2196F3', '#000000'],
      shape: 'lucide:Waves',
      description: t('sectors.career.description'),
    },
    {
      direction: t('directions.NE'),
      name: t('sectors.knowledge.name'),
      element: t('elements.earth'),
      colors: ['#BCA16A', '#F57C00', '#FFB300'],
      shape: 'lucide:Square',
      description: t('sectors.knowledge.description'),
    },
    {
      direction: t('directions.E'),
      name: t('sectors.family.name'),
      element: t('elements.wood'),
      colors: ['#2E7D32', '#388E3C', '#4CAF50', '#40E0D0'],
      shape: 'lucide:RectangleHorizontal',
      description: t('sectors.family.description'),
    },
    {
      direction: t('directions.SE'),
      name: t('sectors.wealth.name'),
      element: t('elements.wood'),
      colors: ['#2E7D32', '#43A047', '#40E0D0'],
      shape: 'lucide:RectangleHorizontal',
      description: t('sectors.wealth.description'),
    },
    {
      direction: t('directions.S'),
      name: t('sectors.fame.name'),
      element: t('elements.fire'),
      colors: ['#D32F2F', '#F44336', '#FF5722'],
      shape: 'lucide:Triangle',
      description: t('sectors.fame.description'),
    },
    {
      direction: t('directions.SO'),
      name: t('sectors.relationships.name'),
      element: t('elements.earth'),
      colors: ['#BCA16A', '#FFA726', '#FFCC80', '#A1887F'],
      shape: 'lucide:Square',
      description: t('sectors.relationships.description'),
    },
    {
      direction: t('directions.O'),
      name: t('sectors.creativity.name'),
      element: t('elements.metal'),
      colors: ['#B0BEC5', '#CFD8DC', '#ECEFF1', '#FFD700'],
      shape: 'lucide:Circle',
      description: t('sectors.creativity.description'),
    },
    {
      direction: t('directions.NO'),
      name: t('sectors.mentors.name'),
      element: t('elements.metal'),
      colors: ['#B0BEC5', '#CFD8DC', '#ECEFF1', '#FFD700'],
      shape: 'lucide:Circle',
      description: t('sectors.mentors.description'),
    },
    {
      direction: t('directions.Center'),
      name: t('sectors.health.name'),
      element: t('elements.earth'),
      colors: ['#FBC02D', '#FFEB3B', '#FFA000'],
      shape: 'lucide:Square',
      description: t('sectors.health.description'),
    },
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
                src="/*2026.svg"
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

      {/* Origines Feng Shui + 5 éléments */}
      <Section
        size={'full'}
        className="bg-muted/30"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <H2 className="text-4xl font-bold mb-4 text-foreground">{t('sectors.title')}</H2>
            <P className="text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('sectors.origins')}
            </P>
          </div>

          {/* 5 éléments en cercle/ligne */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {fiveElements.map((el, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-md border-2 border-white"
                  style={{ backgroundColor: el.color }}
                >
                  <Icon name={el.icon as KnownIconName} className="w-8 h-8 text-white" />
                </div>
                <span className="text-sm font-semibold text-foreground">{el.name}</span>
                {/* Flèche cycle productif (sauf dernier) */}
                {idx < fiveElements.length - 1 && (
                  <Icon
                    name="lucide:ArrowRight"
                    className="hidden sm:block absolute w-4 h-4 text-muted-foreground/40"
                    style={{ display: 'none' }}
                  />
                )}
              </div>
            ))}
          </div>

          <P className="text-center text-sm text-muted-foreground max-w-3xl mx-auto mb-8">
            {t('sectors.subtitle', { year: currentYear })}
          </P>

          {/* 9 secteurs grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {sectors.map((sector, idx) => (
              <Card
                key={idx}
                className="group hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{
                    background: `linear-gradient(90deg, ${sector.colors.join(', ')})`,
                  }}
                />
                <CardContent className="p-6 pt-8">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                        style={{
                          background: `linear-gradient(135deg, ${sector.colors[0]}, ${sector.colors[1]})`,
                        }}
                      >
                        <Icon name={sector.shape as KnownIconName} className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            {sector.direction}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${sector.colors[0]}20`,
                              color: sector.colors[0],
                            }}
                          >
                            {sector.element}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-foreground leading-tight mt-1">
                          {sector.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {sector.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Link href="/analyze" className="mt-8 inline-block">
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
