'use client'

import {
  Button,
  Card,
  H1,
  H2,
  H3,
  Icon,
  Input,
  KnownIconName,
  P,
  Section,
  TypewriterEffectSmooth,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const t = useTranslations('home')

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Handle email submission
    console.log('Email submitted:', email)
    alert(t('cta.thankYou'))
    setEmail('')
  }

  return (
    <>
      {/* Hero Section */}
      <Section
        size={'full'}
        className="dark:bg-gradient-to-br dark:from-green-900 dark:to-blue-900 bg-gradient-to-br from-green-50 to-blue-50"
      >
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <H1 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {t('hero.title')}
            </H1>
            <div className="mb-4">
              <H2 className="text-2xl lg:text-3xl font-semibold mb-2">{t('hero.subtitle')}</H2>
              <div className="flex justify-center items-center min-h-[60px]">
                <TypewriterEffectSmooth
                  words={[
                    {
                      text: t('hero.typewriterText'),
                      className: "text-lg lg:text-xl font-medium text-center bg-gradient-to-r from-green-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent"
                    }
                  ]}
                  className="flex justify-center"
                  cursorClassName="bg-gradient-to-r from-green-500 to-blue-500"
                  duration={3}
                  delay={0.5}
                />
              </div>
            </div>
            <P className="text-lg lg:text-xl mb-8 max-w-3xl mx-auto text-muted-foreground">
              {t('hero.description')}
            </P>

            <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
              <P className="text-lg font-medium mb-4">{t('hero.cta')}</P>
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="email"
                  placeholder={t('hero.emailPlaceholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-primary-foreground font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {t('hero.notifyMe')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </Section>

      {/* Value Proposition Section */}
      <Section size={'xl'}>
        <div className="container mx-auto">
          <Card className="max-w-4xl mx-auto p-8 lg:p-12 border-l-4 border-primary">
            <P className="text-lg lg:text-xl  mb-6 leading-relaxed">{t('value.intro')}</P>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: 'lucide:MessageCircle',
                  text: t('value.points.chat'),
                },
                { icon: 'lucide:Gauge', text: t('value.points.measure') },
                {
                  icon: 'lucide:TrendingUp',
                  text: t('value.points.improve'),
                },
                {
                  icon: 'lucide:Target',
                  text: t('value.points.roadmap'),
                },
                {
                  icon: 'lucide:Banknote',
                  text: t('value.points.qualify'),
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Icon
                    name={item.icon as KnownIconName}
                    className="w-6 h-6 text-primary mt-1 flex-shrink-0"
                  />
                  <P className="">{item.text}</P>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* Example Interaction Section */}
      <Section
        size={'xl'}
        className="max-w-full bg-gradient-to-br from-green-50 to-blue-50 dark:bg-gradient-to-br dark:from-green-900 dark:to-blue-900"
      >
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <H3 className="text-3xl font-bold text-center mb-12">{t('example.title')}</H3>
            <Card className="p-8 space-y-6">
              <div className="bg-muted/50 p-6 rounded-xl border-l-4 border-primary">
                <div className="flex items-start space-x-3">
                  <Icon name="lucide:User" className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <P className="font-semibold text-primary mb-2">{t('example.user')}</P>
                    <P className="">{t('example.userMessage')}</P>
                  </div>
                </div>
              </div>

              <div className="bg-accent/50 p-6 rounded-xl border-l-4 border-accent-foreground">
                <div className="flex items-start space-x-3">
                  <Icon name="lucide:Bot" className="w-6 h-6 text-accent-foreground mt-1" />
                  <div>
                    <P className="font-semibold text-accent-foreground mb-2">{t('example.ai')}</P>
                    <P className="">{t('example.aiMessage')}</P>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Section>

      {/* Packages Section */}
      <Section size={'full'}>
        <div className="container mx-auto">
          <H3 className="text-4xl font-bold text-center mb-16">{t('packages.title')}</H3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Free Package */}
            <Card className="p-8 border-2 hover:border-primary transition-colors duration-200">
              <div className="text-center mb-6">
                <Icon
                  name="lucide:MessageCircle"
                  className="w-12 h-12 text-muted-foreground mx-auto mb-4"
                />
                <H3 className="text-2xl font-bold mb-2">{t('packages.free.title')}</H3>
                <P className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t('packages.free.subtitle')}
                </P>
              </div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t('packages.free.description')}
              </P>

              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <Icon name="lucide:MessageCircle" className="w-5 h-5 text-primary" />
                  <span className="">{t('packages.free.features.chat')}</span>
                </li>
              </ul>
            </Card>

            {/* Premium Package */}
            <Card className="p-8 border-2 border-primary/30 bg-gradient-to-b from-green-50 to-white relative dark:bg-gradient-to-b dark:from-green-900 dark:to-gray-900">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  {t('packages.premium.badge')}
                </span>
              </div>

              <div className="text-center mb-6">
                <Icon name="lucide:TrendingUp" className="w-12 h-12 text-primary mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">
                  {t('packages.premium.title')}
                </H3>
                <P className="text-sm font-medium text-primary uppercase tracking-wide">
                  {t('packages.premium.subtitle')}
                </P>
              </div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t('packages.premium.description')}
              </P>

              <ul className="space-y-3">
                {[
                  { icon: 'lucide:MessageCircle', text: t('packages.premium.features.chat') },
                  { icon: 'lucide:BarChart3', text: t('packages.premium.features.tools') },
                  { icon: 'lucide:Upload', text: t('packages.premium.features.import') },
                  { icon: 'lucide:PieChart', text: t('packages.premium.features.analysis') },
                  { icon: 'lucide:ClipboardList', text: t('packages.premium.features.plans') },
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 text-primary" />
                    <span className=" text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Golden Package */}
            <Card className="p-8 border-2 border-amber-300 bg-gradient-to-b from-yellow-50 to-white dark:bg-gradient-to-b dark:from-yellow-900 dark:to-gray-900">
              <div className="text-center mb-6">
                <Icon name="lucide:Award" className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">
                  {t('packages.golden.title')}
                </H3>
                <P className="text-sm font-medium text-amber-600 uppercase tracking-wide">
                  {t('packages.golden.subtitle')}
                </P>
              </div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t('packages.golden.description')}
              </P>

              <ul className="space-y-3">
                {[
                  { icon: 'lucide:Star', text: t('packages.golden.features.all') },
                  {
                    icon: 'lucide:Handshake',
                    text: t('packages.golden.features.support'),
                  },
                  { icon: 'lucide:UserCheck', text: t('packages.golden.features.replace') },
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 text-amber-500" />
                    <span className=" text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </Section>

      {/* Bottom CTA Section */}
      <Section size={'xl'} className="max-w-full bg-gradient-to-r from-green-600 to-blue-600 ">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <H3 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
              {t('cta.title')}
            </H3>
            <P className="text-xl text-primary-foreground/90 mb-8">{t('cta.description')}</P>

            <form
              onSubmit={handleEmailSubmit}
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder={t('hero.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex-1 bg-white"
              />
              <Button
                type="submit"
                className="bg-background text-primary hover:bg-background/80 font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t('cta.joinWaitlist')}
              </Button>
            </form>
          </div>
        </div>
      </Section>
    </>
  )
}
