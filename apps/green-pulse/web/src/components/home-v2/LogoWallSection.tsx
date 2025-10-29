'use client'

import { H3, P, Section } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

/**
 * Logo wall showcasing trusted companies
 * Placeholder logos - replace with actual client logos
 */
export function LogoWallSection() {
  const t = useTranslations('homeV2.logoWall')

  const companies = [
    { name: 'Microsoft', logo: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f8371703ce1c8757aa379d_microsoft.svg' },
    { name: 'Google', logo: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f8371647f20373113d2bad_google.svg' },
    { name: 'Adobe', logo: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f83717a3f012164fa23bf7_adobe.svg' },
    { name: 'Amazon', logo: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f83716e09698fe456f19c7_amazon.svg' },
    { name: 'Meta', logo: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f83716bd50f8d47aec7a05_facebook.svg' },
    { name: 'Notion', logo: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f83716df0fd2b006a9cf0c_notion.svg' },
  ]

  return (
    <Section size={'xl'} className="bg-background">
      <div className="text-center mb-12">
        <H3 className="text-2xl sm:text-3xl font-bold mb-4">
          {t('title')}
        </H3>
        <P className="text-muted-foreground max-w-2xl mx-auto">
          {t('subtitle')}
        </P>
      </div>

      {/* Logo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center opacity-60 hover:opacity-100 transition-opacity duration-300">
        {companies.map((company, index) => (
          <div
            key={index}
            className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300"
          >
            <Image
              src={company.logo}
              alt={`${company.name} logo`}
              width={120}
              height={60}
              className="object-contain"
            />
          </div>
        ))}
      </div>
    </Section>
  )
}
