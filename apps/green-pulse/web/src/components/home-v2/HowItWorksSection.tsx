'use client'

import { Card, H2, H3, Icon, KnownIconName, P, Section } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

/**
 * How it works section
 * 3 steps showcasing the user journey
 */
export function HowItWorksSection() {
  const t = useTranslations('homeV2.howItWorks')

  const steps = [
    {
      number: '01',
      icon: 'lucide:MessageSquare' as KnownIconName,
      title: t('step1.title'),
      description: t('step1.description'),
      image: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/65b231028c9781d73b1608f4_idea_to_deck.webp',
    },
    {
      number: '02',
      icon: 'lucide:Lightbulb' as KnownIconName,
      title: t('step2.title'),
      description: t('step2.description'),
      image: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/65b2310f6401a7de57cb84e9_form_to_deck.webp',
    },
    {
      number: '03',
      icon: 'lucide:TrendingUp' as KnownIconName,
      title: t('step3.title'),
      description: t('step3.description'),
      image: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/65b2311c49cf7f0de4b5045f_Outline%20to%20Deck.webp',
    },
  ]

  return (
    <Section size={'full'} className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <div className="text-center mb-16">
        <H2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
          {t('title')}
        </H2>
        <P className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
          {t('subtitle')}
        </P>
      </div>

      <div className="space-y-16 lg:space-y-24 max-w-6xl mx-auto">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
            } gap-8 lg:gap-12 items-center`}
          >
            {/* Image side */}
            <div className="flex-1 relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800">
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating number badge */}
              <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-xl">
                <span className="text-3xl font-bold text-white">{step.number}</span>
              </div>
            </div>

            {/* Text side */}
            <div className="flex-1">
              <Card className="p-8 lg:p-10 border-l-4 border-green-500">
                {/* Icon */}
                <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Icon
                    name={step.icon}
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                  />
                </div>

                {/* Title */}
                <H3 className="text-2xl lg:text-3xl font-bold mb-4">
                  {step.title}
                </H3>

                {/* Description */}
                <P className="text-lg text-muted-foreground leading-relaxed">
                  {step.description}
                </P>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
