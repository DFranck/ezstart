'use client'

import { H3, P, Section } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

/**
 * Stats section showcasing impact
 * Numbers animate on scroll/mount
 */
export function StatsSection() {
  const t = useTranslations('homeV2.stats')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    {
      value: '50x',
      label: t('stat1.label'),
      color: 'text-green-600 dark:text-green-400',
    },
    {
      value: '10x',
      label: t('stat2.label'),
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      value: '500%',
      label: t('stat3.label'),
      color: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <Section size={'xl'} className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`text-center transform transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionDelay: `${index * 150}ms` }}
          >
            <H3
              className={`text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 ${stat.color}`}
            >
              {stat.value}
            </H3>
            <P className="text-lg sm:text-xl text-foreground font-medium">
              {stat.label}
            </P>
          </div>
        ))}
      </div>
    </Section>
  )
}
