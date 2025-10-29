'use client'

import { Card, H2, H3, Icon, KnownIconName, P, Section } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

/**
 * Features grid showcasing main product features
 * 9 features in a 3x3 grid
 */
export function FeaturesSection() {
  const t = useTranslations('homeV2.features')

  const features = [
    {
      icon: 'lucide:MessageCircle' as KnownIconName,
      title: t('feature1.title'),
      description: t('feature1.description'),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: 'lucide:Gauge' as KnownIconName,
      title: t('feature2.title'),
      description: t('feature2.description'),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: 'lucide:TrendingUp' as KnownIconName,
      title: t('feature3.title'),
      description: t('feature3.description'),
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      icon: 'lucide:Target' as KnownIconName,
      title: t('feature4.title'),
      description: t('feature4.description'),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      icon: 'lucide:Banknote' as KnownIconName,
      title: t('feature5.title'),
      description: t('feature5.description'),
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      icon: 'lucide:Shield' as KnownIconName,
      title: t('feature6.title'),
      description: t('feature6.description'),
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      icon: 'lucide:Share2' as KnownIconName,
      title: t('feature7.title'),
      description: t('feature7.description'),
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      icon: 'lucide:BarChart3' as KnownIconName,
      title: t('feature8.title'),
      description: t('feature8.description'),
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    },
    {
      icon: 'lucide:Globe' as KnownIconName,
      title: t('feature9.title'),
      description: t('feature9.description'),
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    },
  ]

  return (
    <Section size={'full'} className="bg-background">
      <div className="text-center mb-16">
        <H2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
          {t('title')}
        </H2>
        <P className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
          {t('subtitle')}
        </P>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-green-200 dark:hover:border-green-800"
          >
            {/* Icon */}
            <div className={`${feature.bgColor} w-16 h-16 rounded-2xl flex items-center justify-center mb-6`}>
              <Icon
                name={feature.icon}
                className={`w-8 h-8 ${feature.color}`}
              />
            </div>

            {/* Title */}
            <H3 className="text-xl font-bold mb-3">
              {feature.title}
            </H3>

            {/* Description */}
            <P className="text-muted-foreground leading-relaxed">
              {feature.description}
            </P>
          </Card>
        ))}
      </div>
    </Section>
  )
}
